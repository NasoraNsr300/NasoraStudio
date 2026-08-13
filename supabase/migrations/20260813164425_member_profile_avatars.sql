create table public.profile_avatar_media (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  object_key text not null unique check (
    object_key ~ '^member-avatars/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$'
  ),
  content_type text not null check (content_type = 'image/webp'),
  size_bytes bigint not null check (size_bytes between 1 and 5242880),
  etag text not null check (nullif(btrim(etag), '') is not null and char_length(etag) <= 200),
  width integer not null check (width = 512),
  height integer not null check (height = 512),
  state text not null default 'active' check (state in ('active', 'pending_cleanup', 'deleted')),
  created_at timestamptz not null default now(),
  replaced_at timestamptz,
  deleted_at timestamptz,
  constraint profile_avatar_media_state_check check (
    (state = 'active' and replaced_at is null and deleted_at is null)
    or (state = 'pending_cleanup' and replaced_at is not null and deleted_at is null)
    or (state = 'deleted' and replaced_at is not null and deleted_at is not null)
  )
);

alter table public.profiles
  add column avatar_media_id uuid references public.profile_avatar_media(id) on delete set null;

create index profile_avatar_media_owner_idx on public.profile_avatar_media (user_id, created_at desc);
create index profile_avatar_media_cleanup_idx on public.profile_avatar_media (replaced_at) where state = 'pending_cleanup';

alter table public.profile_avatar_media enable row level security;

alter table private.cleanup_tasks drop constraint cleanup_tasks_target_type_check;
alter table private.cleanup_tasks add constraint cleanup_tasks_target_type_check
  check (target_type in ('delivery', 'message_asset', 'progress_image', 'profile_avatar'));

create function public.gateway_finalize_profile_avatar(
  p_user_id uuid,
  p_media_id uuid,
  p_object_key text,
  p_size_bytes bigint,
  p_etag text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles%rowtype;
  v_previous_id uuid;
begin
  if p_user_id is null or p_media_id is null
    or p_object_key !~ '^member-avatars/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$'
    or p_size_bytes not between 1 and 5242880
    or nullif(btrim(p_etag), '') is null or char_length(p_etag) > 200 then
    raise exception 'invalid_profile_avatar';
  end if;

  select * into v_profile
  from public.profiles
  where user_id = p_user_id
  for update;

  if v_profile.user_id is null then raise exception 'profile_not_found'; end if;
  v_previous_id := v_profile.avatar_media_id;

  insert into public.profile_avatar_media (
    id, user_id, object_key, content_type, size_bytes, etag, width, height, state
  ) values (
    p_media_id, p_user_id, p_object_key, 'image/webp', p_size_bytes, btrim(p_etag), 512, 512, 'active'
  );

  update public.profiles
  set avatar_media_id = p_media_id, updated_at = now()
  where user_id = p_user_id;

  if v_previous_id is not null and v_previous_id <> p_media_id then
    update public.profile_avatar_media
    set state = 'pending_cleanup', replaced_at = now()
    where id = v_previous_id and user_id = p_user_id and state = 'active';

    if found then
      insert into private.cleanup_tasks (target_type, target_id, due_at)
      values ('profile_avatar', v_previous_id, now())
      on conflict (target_type, target_id) do update
      set due_at = excluded.due_at, status = 'pending', last_error = null;
    end if;
  end if;

  return p_media_id;
end; $$;

create function public.gateway_get_profile_avatar(p_media_id uuid, p_user_id uuid)
returns table(object_key text, content_type text, etag text, size_bytes bigint)
language sql stable security definer set search_path = '' as $$
  select media.object_key, media.content_type, media.etag, media.size_bytes
  from public.profile_avatar_media media
  join public.profiles profile on profile.user_id = media.user_id
  where media.id = p_media_id
    and media.user_id = p_user_id
    and profile.avatar_media_id = media.id
    and media.state = 'active';
$$;

create or replace function public.claim_cleanup_batch(p_limit integer default 10)
returns table(task_id uuid, target_type text, target_id uuid, object_key text, delivery_kind text)
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with claimed as (
    select task.id from private.cleanup_tasks task
    where task.status in ('pending', 'failed') and task.attempts < 5 and task.due_at <= now()
    order by task.due_at for update skip locked limit least(greatest(p_limit, 1), 20)
  ), updated as (
    update private.cleanup_tasks task set status = 'processing', attempts = task.attempts + 1
    from claimed where task.id = claimed.id
    returning task.id, task.target_type, task.target_id
  )
  select updated.id, updated.target_type, updated.target_id,
    case updated.target_type
      when 'delivery' then delivery.object_key
      when 'message_asset' then asset.object_key
      when 'progress_image' then progress.image_object_key
      when 'profile_avatar' then avatar.object_key
    end,
    case when updated.target_type = 'delivery' then delivery.kind end
  from updated
  left join public.deliveries delivery on updated.target_type = 'delivery' and delivery.id = updated.target_id
  left join public.message_assets asset on updated.target_type = 'message_asset' and asset.id = updated.target_id
  left join public.job_progress_updates progress on updated.target_type = 'progress_image' and progress.id = updated.target_id
  left join public.profile_avatar_media avatar on updated.target_type = 'profile_avatar' and avatar.id = updated.target_id;
end; $$;

create or replace function public.complete_cleanup_task(p_task_id uuid, p_success boolean, p_error text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_task private.cleanup_tasks%rowtype;
begin
  select * into v_task from private.cleanup_tasks where id = p_task_id and status = 'processing' for update;
  if v_task.id is null then return; end if;
  if not p_success then
    update private.cleanup_tasks set status = 'failed', last_error = left(coalesce(p_error, 'cleanup_failed'), 500) where id = p_task_id;
    return;
  end if;

  if v_task.target_type = 'delivery' then
    update public.deliveries set hidden_at = coalesce(hidden_at, now()), deleted_at = case when kind = 'r2_file' then coalesce(deleted_at, now()) else deleted_at end where id = v_task.target_id;
  elsif v_task.target_type = 'message_asset' then
    update public.message_assets set deleted_at = coalesce(deleted_at, now()) where id = v_task.target_id;
  elsif v_task.target_type = 'progress_image' then
    update public.job_progress_updates set image_object_key = null, image_content_type = null, image_size_bytes = null, image_etag = null where id = v_task.target_id;
  elsif v_task.target_type = 'profile_avatar' then
    update public.profile_avatar_media set state = 'deleted', deleted_at = now()
    where id = v_task.target_id and state = 'pending_cleanup';
  end if;

  update private.cleanup_tasks set status = 'complete', last_error = null where id = p_task_id;
end; $$;

revoke all on public.profile_avatar_media from public, anon, authenticated, service_role;
revoke update on public.profiles from authenticated;
grant update (nickname, preferred_locale, updated_at) on public.profiles to authenticated;
revoke all on function public.gateway_finalize_profile_avatar(uuid, uuid, text, bigint, text) from public, anon, authenticated, service_role;
revoke all on function public.gateway_get_profile_avatar(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.gateway_finalize_profile_avatar(uuid, uuid, text, bigint, text) to service_role;
grant execute on function public.gateway_get_profile_avatar(uuid, uuid) to service_role;

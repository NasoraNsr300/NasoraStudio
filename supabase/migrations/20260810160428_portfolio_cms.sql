create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.commission_albums(id) on delete restrict,
  media_id uuid not null references public.commission_catalog_media(id) on delete restrict,
  title jsonb not null,
  featured boolean not null default false,
  display_order integer not null default 0 check (display_order >= 0),
  published boolean not null default false,
  archived_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolio_items_title_check check (
    jsonb_typeof(title) = 'object'
    and title ? 'th' and title ? 'en'
    and nullif(btrim(title ->> 'th'), '') is not null
    and nullif(btrim(title ->> 'en'), '') is not null
  )
);

create index portfolio_items_public_order_idx
  on public.portfolio_items (display_order, created_at, id)
  where published = true and archived_at is null;
create index portfolio_items_album_idx
  on public.portfolio_items (album_id, display_order);
create index portfolio_items_media_idx
  on public.portfolio_items (media_id);

alter table public.portfolio_items enable row level security;

create policy portfolio_items_public_select
on public.portfolio_items for select to anon, authenticated
using (
  published = true
  and archived_at is null
  and exists (
    select 1
    from public.commission_albums a
    where a.id = portfolio_items.album_id
      and a.published = true
      and a.archived_at is null
  )
);

create policy portfolio_items_admin_select
on public.portfolio_items for select to authenticated
using ((select private.is_admin()));

drop policy commission_catalog_media_public_select on public.commission_catalog_media;
create policy commission_catalog_media_public_select
on public.commission_catalog_media for select to anon, authenticated
using (
  archived_at is null and (
    exists (
      select 1 from public.commission_albums album
      where album.cover_media_id = commission_catalog_media.id
        and album.published = true and album.archived_at is null
    )
    or exists (
      select 1
      from public.commission_services service
      join public.commission_albums album on album.id = service.album_id
      where service.cover_media_id = commission_catalog_media.id
        and service.published = true and service.archived_at is null
        and album.published = true and album.archived_at is null
    )
    or exists (
      select 1
      from public.portfolio_items item
      join public.commission_albums album on album.id = item.album_id
      where item.media_id = commission_catalog_media.id
        and item.published = true and item.archived_at is null
        and album.published = true and album.archived_at is null
    )
  )
);

grant select on public.portfolio_items to anon, authenticated;
revoke insert, update, delete on public.portfolio_items from anon, authenticated;

create or replace function public.admin_save_portfolio_item(
  p_item_id uuid,
  p_album_id uuid,
  p_media_id uuid,
  p_title jsonb,
  p_featured boolean,
  p_display_order integer,
  p_published boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_album_published boolean;
  v_id uuid;
  v_before jsonb;
  v_after jsonb;
begin
  if not (select private.is_admin()) then raise exception 'admin_access_required'; end if;
  if p_display_order < 0 then raise exception 'invalid_portfolio_order'; end if;
  if jsonb_typeof(p_title) <> 'object'
    or nullif(btrim(p_title ->> 'th'), '') is null
    or nullif(btrim(p_title ->> 'en'), '') is null
  then raise exception 'invalid_portfolio_title'; end if;

  select album.published into v_album_published
  from public.commission_albums album
  where album.id = p_album_id and album.archived_at is null;
  if not found then raise exception 'portfolio_album_not_found'; end if;
  if p_published and not v_album_published then raise exception 'portfolio_album_not_published'; end if;
  if not exists (
    select 1 from public.commission_catalog_media media
    where media.id = p_media_id and media.archived_at is null
  ) then raise exception 'portfolio_media_not_found'; end if;

  if p_item_id is null then
    insert into public.portfolio_items
      (album_id, media_id, title, featured, display_order, published, created_by, updated_by)
    values
      (p_album_id, p_media_id, p_title, p_featured, p_display_order, p_published, v_actor, v_actor)
    returning id, to_jsonb(portfolio_items.*) into v_id, v_after;
  else
    select to_jsonb(item.*) into v_before
    from public.portfolio_items item
    where item.id = p_item_id
    for update;
    if not found then raise exception 'portfolio_item_not_found'; end if;

    update public.portfolio_items
    set album_id = p_album_id,
        media_id = p_media_id,
        title = p_title,
        featured = p_featured,
        display_order = p_display_order,
        published = p_published,
        updated_by = v_actor,
        updated_at = now()
    where id = p_item_id
    returning id, to_jsonb(portfolio_items.*) into v_id, v_after;
  end if;

  insert into public.audit_logs
    (actor_user_id, actor_role, action, entity_type, entity_id, before_state, after_state)
  values
    (v_actor, 'admin',
      case when p_item_id is null then 'create_portfolio_item' else 'update_portfolio_item' end,
      'portfolio_item', v_id, v_before, v_after);
  return v_id;
end;
$$;

create or replace function public.admin_set_portfolio_item_archive(
  p_item_id uuid,
  p_archived boolean,
  p_reason text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_before jsonb;
  v_after jsonb;
begin
  if not (select private.is_admin()) then raise exception 'admin_access_required'; end if;

  select to_jsonb(item.*) into v_before
  from public.portfolio_items item
  where item.id = p_item_id
  for update;
  if not found then raise exception 'portfolio_item_not_found'; end if;

  update public.portfolio_items
  set archived_at = case when p_archived then coalesce(archived_at, now()) else null end,
      published = case when p_archived then false else published end,
      updated_by = v_actor,
      updated_at = now()
  where id = p_item_id
  returning to_jsonb(portfolio_items.*) into v_after;

  insert into public.audit_logs
    (actor_user_id, actor_role, action, entity_type, entity_id, before_state, after_state, reason)
  values
    (v_actor, 'admin',
      case when p_archived then 'archive_portfolio_item' else 'restore_portfolio_item' end,
      'portfolio_item', p_item_id, v_before, v_after, nullif(btrim(p_reason), ''));
end;
$$;

create or replace function public.admin_create_portfolio_media(
  p_object_key text,
  p_etag text,
  p_content_type text,
  p_width integer,
  p_height integer,
  p_alt jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_after jsonb;
begin
  if not (select private.is_admin()) then raise exception 'admin_access_required'; end if;
  if p_object_key !~ '^portfolio/[0-9a-f-]{36}\.(png|jpg|webp)$' then raise exception 'invalid_portfolio_media_key'; end if;
  if p_width < 1 or p_width > 20000 or p_height < 1 or p_height > 20000 then raise exception 'invalid_portfolio_media_size'; end if;
  if p_content_type not in ('image/png', 'image/jpeg', 'image/webp') then raise exception 'invalid_portfolio_media_type'; end if;
  insert into public.commission_catalog_media
    (object_key, etag, content_type, width, height, alt, created_by)
  values
    (p_object_key, p_etag, p_content_type, p_width, p_height, p_alt, (select auth.uid()))
  returning id, to_jsonb(commission_catalog_media.*) into v_id, v_after;
  insert into public.audit_logs
    (actor_user_id, actor_role, action, entity_type, entity_id, after_state)
  values ((select auth.uid()), 'admin', 'create_portfolio_media', 'commission_catalog_media', v_id, v_after);
  return v_id;
end;
$$;

revoke all on function public.admin_save_portfolio_item(uuid, uuid, uuid, jsonb, boolean, integer, boolean) from public;
revoke all on function public.admin_set_portfolio_item_archive(uuid, boolean, text) from public;
revoke all on function public.admin_create_portfolio_media(text, text, text, integer, integer, jsonb) from public;
revoke execute on function public.admin_save_portfolio_item(uuid, uuid, uuid, jsonb, boolean, integer, boolean) from anon, service_role;
revoke execute on function public.admin_set_portfolio_item_archive(uuid, boolean, text) from anon, service_role;
revoke execute on function public.admin_create_portfolio_media(text, text, text, integer, integer, jsonb) from anon, service_role;
grant execute on function public.admin_save_portfolio_item(uuid, uuid, uuid, jsonb, boolean, integer, boolean) to authenticated;
grant execute on function public.admin_set_portfolio_item_archive(uuid, boolean, text) to authenticated;
grant execute on function public.admin_create_portfolio_media(text, text, text, integer, integer, jsonb) to authenticated;

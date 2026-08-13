create function public.gateway_reset_test_customer_avatar(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_avatar_id uuid;
begin
  if coalesce((select auth.jwt()) ->> 'role', '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from auth.users account
    where account.id = p_user_id
      and lower(account.email) = 'customer.test@nasora.local'
      and account.raw_app_meta_data ->> 'role' = 'member'
  ) then
    raise exception 'test_customer_not_allowed' using errcode = '42501';
  end if;

  select profile.avatar_media_id
  into v_avatar_id
  from public.profiles profile
  where profile.user_id = p_user_id
  for update;

  if v_avatar_id is null then return null; end if;

  update public.profiles
  set avatar_media_id = null,
      updated_at = now()
  where user_id = p_user_id;

  update public.profile_avatar_media
  set state = 'pending_cleanup',
      replaced_at = now()
  where id = v_avatar_id
    and user_id = p_user_id
    and state = 'active';

  if found then
    insert into private.cleanup_tasks (target_type, target_id, due_at)
    values ('profile_avatar', v_avatar_id, now())
    on conflict (target_type, target_id) do update
    set due_at = excluded.due_at,
        status = 'pending',
        last_error = null;
  end if;

  return v_avatar_id;
end;
$$;

revoke all on function public.gateway_reset_test_customer_avatar(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.gateway_reset_test_customer_avatar(uuid)
to service_role;

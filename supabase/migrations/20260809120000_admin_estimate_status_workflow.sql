create function public.admin_transition_commission_request(
  p_request_id uuid,
  p_status text,
  p_reason text default null
) returns table(request_id uuid, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.commission_requests%rowtype;
  v_after public.commission_requests%rowtype;
  v_status text := nullif(btrim(p_status), '');
  v_reason text := nullif(btrim(p_reason), '');
begin
  if not private.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if v_status not in ('reviewing', 'declined') then
    raise exception 'invalid_request_transition';
  end if;

  if v_status = 'declined' and v_reason is null then
    raise exception 'decline_reason_required';
  end if;

  select * into v_before
  from public.commission_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'request_not_found';
  end if;

  if not (
    (v_before.status = 'submitted' and v_status in ('reviewing', 'declined'))
    or (v_before.status = 'reviewing' and v_status = 'declined')
  ) then
    raise exception 'invalid_request_transition';
  end if;

  update public.commission_requests
  set
    status = v_status,
    closed_at = case when v_status = 'declined' then now() else closed_at end
  where id = p_request_id
  returning * into v_after;

  insert into public.audit_logs (
    actor_user_id, actor_role, action, entity_type, entity_id,
    before_state, after_state, reason
  ) values (
    auth.uid(), 'admin',
    case when v_status = 'reviewing' then 'review_estimate_request' else 'decline_estimate_request' end,
    'commission_request', p_request_id,
    to_jsonb(v_before) - 'guest_contact_snapshot' - 'contact_snapshot',
    to_jsonb(v_after) - 'guest_contact_snapshot' - 'contact_snapshot',
    v_reason
  );

  return query select v_after.id, v_after.status;
end;
$$;

revoke all on function public.admin_transition_commission_request(uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_transition_commission_request(uuid, text, text)
  to authenticated;

revoke update on public.commission_requests from authenticated;

-- A successful delivery must advance the same job into the delivery stage.
-- Keep the delivery row, notification, status history, queue projection, and audit
-- in one database transaction so the member never sees a file with a stale status.

create or replace function public.admin_create_drive_delivery(
  p_job_id uuid,
  p_url text,
  p_display_name text
)
returns table(delivery_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delivery_id uuid;
  v_member_id uuid;
  v_current_status_key text;
  v_current_status_terminal boolean;
  v_delivery_status_id uuid;
begin
  if not private.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_url !~ '^https://drive\.google\.com/' or nullif(btrim(p_display_name), '') is null then
    raise exception 'invalid_delivery';
  end if;

  select job.user_id, current_status.stable_key, current_status.is_terminal, delivery_status.id
  into v_member_id, v_current_status_key, v_current_status_terminal, v_delivery_status_id
  from public.jobs job
  join public.status_definitions current_status on current_status.id = job.status_id
  left join public.status_definitions delivery_status
    on delivery_status.workflow_id = job.workflow_id
   and delivery_status.stable_key = 'delivery'
   and delivery_status.archived_at is null
  where job.id = p_job_id and job.customer_type = 'member'
  for update of job;

  if v_member_id is null then raise exception 'member_job_required'; end if;
  if v_delivery_status_id is null then raise exception 'status_not_in_job_workflow'; end if;

  insert into public.deliveries (job_id, kind, display_name, external_url, delivered_by)
  values (p_job_id, 'google_drive', btrim(p_display_name), p_url, auth.uid())
  returning id into v_delivery_id;

  insert into public.notifications (recipient_user_id, type, title, body, target_url, entity_type, entity_id)
  values (
    v_member_id,
    'delivery',
    '{"th":"ส่งมอบงานแล้ว","en":"Delivery ready"}',
    '{"th":"ไฟล์จะเปิดเมื่อชำระเงินครบ","en":"Your delivery unlocks after full payment"}',
    '/th/member/jobs/' || p_job_id,
    'delivery',
    v_delivery_id
  );

  insert into private.cleanup_tasks (target_type, target_id, due_at)
  select 'delivery', v_delivery_id, delivery.expires_at
  from public.deliveries delivery
  where delivery.id = v_delivery_id;

  if not v_current_status_terminal and v_current_status_key <> 'delivery' then
    perform private.change_job_status(p_job_id, v_delivery_status_id, null, null);
  end if;

  return query select v_delivery_id;
end;
$$;

create or replace function public.admin_create_file_delivery(
  p_job_id uuid,
  p_object_key text,
  p_display_name text,
  p_content_type text,
  p_size_bytes bigint,
  p_etag text
)
returns table(delivery_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delivery_id uuid;
  v_member_id uuid;
  v_current_status_key text;
  v_current_status_terminal boolean;
  v_delivery_status_id uuid;
begin
  if not private.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_object_key !~ ('^deliveries/' || p_job_id || '/[^/]+$')
    or nullif(btrim(p_display_name), '') is null
    or p_size_bytes not between 1 and 26214400
    or nullif(btrim(p_content_type), '') is null
    or nullif(btrim(p_etag), '') is null then
    raise exception 'invalid_delivery';
  end if;

  select job.user_id, current_status.stable_key, current_status.is_terminal, delivery_status.id
  into v_member_id, v_current_status_key, v_current_status_terminal, v_delivery_status_id
  from public.jobs job
  join public.status_definitions current_status on current_status.id = job.status_id
  left join public.status_definitions delivery_status
    on delivery_status.workflow_id = job.workflow_id
   and delivery_status.stable_key = 'delivery'
   and delivery_status.archived_at is null
  where job.id = p_job_id and job.customer_type = 'member'
  for update of job;

  if v_member_id is null then raise exception 'member_job_required'; end if;
  if v_delivery_status_id is null then raise exception 'status_not_in_job_workflow'; end if;

  insert into public.deliveries (
    job_id, kind, display_name, object_key, content_type, size_bytes, etag, delivered_by
  ) values (
    p_job_id, 'r2_file', btrim(p_display_name), p_object_key,
    p_content_type, p_size_bytes, p_etag, auth.uid()
  ) returning id into v_delivery_id;

  insert into public.notifications (recipient_user_id, type, title, body, target_url, entity_type, entity_id)
  values (
    v_member_id,
    'delivery',
    '{"th":"ส่งมอบงานแล้ว","en":"Delivery ready"}',
    '{"th":"ไฟล์จะเปิดเมื่อชำระเงินครบ","en":"Your delivery unlocks after full payment"}',
    '/th/member/jobs/' || p_job_id,
    'delivery',
    v_delivery_id
  );

  insert into private.cleanup_tasks (target_type, target_id, due_at)
  select 'delivery', v_delivery_id, delivery.expires_at
  from public.deliveries delivery
  where delivery.id = v_delivery_id;

  if not v_current_status_terminal and v_current_status_key <> 'delivery' then
    perform private.change_job_status(p_job_id, v_delivery_status_id, null, null);
  end if;

  return query select v_delivery_id;
end;
$$;

revoke all on function public.admin_create_drive_delivery(uuid, text, text)
from public, anon, authenticated, service_role;
revoke all on function public.admin_create_file_delivery(uuid, text, text, text, bigint, text)
from public, anon, authenticated, service_role;
grant execute on function public.admin_create_drive_delivery(uuid, text, text) to authenticated;
grant execute on function public.admin_create_file_delivery(uuid, text, text, text, bigint, text) to authenticated;

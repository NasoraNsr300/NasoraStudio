-- Convert an already verified deposit into one durable job and queue entry.
-- The function body is one PostgreSQL transaction: any exception rolls back every write.

create index if not exists payment_slip_attempts_owner_created_idx
  on public.payment_slip_upload_attempts (user_id, created_at desc);

create function private.create_job_from_verified_deposit(p_payment_id uuid)
returns table(job_id uuid, queue_entry_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_payment_intent public.payment_intents%rowtype;
  v_quote public.quotes%rowtype;
  v_request public.commission_requests%rowtype;
  v_workflow public.status_workflows%rowtype;
  v_initial_status public.status_definitions%rowtype;
  v_job public.jobs%rowtype;
  v_queue public.queue_entries%rowtype;
begin
  select payment.* into v_payment
  from public.payments payment
  where payment.id = p_payment_id
  for update;

  if not found then
    raise exception 'verified_deposit_not_found';
  end if;
  if v_payment.kind <> 'deposit' then
    raise exception 'verified_deposit_required';
  end if;

  select payment_intent.* into v_payment_intent
  from public.payment_intents payment_intent
  where payment_intent.id = v_payment.intent_id
  for update;
  if not found or v_payment_intent.status <> 'verified' then
    raise exception 'verified_payment_intent_required';
  end if;

  select job.* into v_job
  from public.jobs job
  where job.accepted_quote_id = v_payment.quote_id
  for update;
  if v_job.id is not null then
    select queue.* into v_queue
    from public.queue_entries queue
    where queue.job_id = v_job.id and queue.archived_at is null
    order by queue.created_at
    limit 1;
    if v_queue.id is null then
      raise exception 'converted_job_queue_missing';
    end if;
    return query select v_job.id, v_queue.id;
    return;
  end if;

  select quote.* into v_quote
  from public.quotes quote
  where quote.id = v_payment.quote_id
    and quote.request_id = v_payment.request_id
    and quote.status = 'sent'
  for update;
  if not found then
    raise exception 'sent_quote_not_found';
  end if;

  select request.* into v_request
  from public.commission_requests request
  where request.id = v_payment.request_id
    and request.user_id = v_payment.user_id
    and request.requester_type = 'member'
    and request.status in ('quoted', 'reviewing')
  for update;
  if not found then
    raise exception 'convertible_member_request_not_found';
  end if;

  select workflow.* into v_workflow
  from public.status_workflows workflow
  where workflow.is_active
    and workflow.archived_at is null
    and (workflow.service_type_slug = v_request.service_type_slug or workflow.is_default)
  order by (workflow.service_type_slug = v_request.service_type_slug) desc, workflow.is_default desc, workflow.created_at
  limit 1
  for update;
  if not found then
    raise exception 'active_workflow_not_found';
  end if;

  select status.* into v_initial_status
  from public.status_definitions status
  where status.workflow_id = v_workflow.id and status.archived_at is null
  order by status.display_order, status.created_at
  limit 1
  for update;
  if not found then
    raise exception 'initial_status_not_found';
  end if;

  update public.quotes
  set status = 'accepted', accepted_at = v_payment.verified_at, updated_at = now()
  where id = v_quote.id;

  update public.commission_requests
  set status = 'converted', updated_at = now()
  where id = v_request.id;

  insert into public.jobs (
    request_id, accepted_quote_id, customer_type, user_id,
    member_display_name_snapshot, contact_snapshot,
    category_slug, category_name_snapshot, service_type_slug, service_type_name_snapshot,
    workflow_id, status_id, original_quote_total_satang, current_total_satang,
    deposit_percent, deposit_verified_at, default_free_revisions, deadline
  ) values (
    v_request.id, v_quote.id, 'member', v_request.user_id,
    v_request.member_display_name_snapshot, v_request.contact_snapshot,
    v_request.category_slug, v_request.category_name_snapshot, v_request.service_type_slug, v_request.service_type_name_snapshot,
    v_workflow.id, v_initial_status.id, v_quote.total_satang, v_quote.total_satang,
    v_quote.deposit_percent, v_payment.verified_at, v_quote.free_revision_count, coalesce(v_quote.proposed_deadline, v_request.requested_deadline)
  ) returning * into v_job;

  insert into public.job_status_history (
    job_id, from_status_id, to_status_id, public_note, private_note, changed_by, changed_at
  ) values (
    v_job.id, null, v_initial_status.id, 'Deposit verified', null, v_payment.verified_by, v_payment.verified_at
  );

  insert into public.queue_entries (
    job_id, customer_display_name, category_name_snapshot, service_type_name_snapshot,
    status_label_snapshot, deadline, default_order_at
  ) values (
    v_job.id, v_request.member_display_name_snapshot, v_request.category_name_snapshot, v_request.service_type_name_snapshot,
    v_initial_status.label, v_job.deadline, v_payment.verified_at
  ) returning * into v_queue;

  insert into public.audit_logs (
    actor_user_id, actor_role, action, entity_type, entity_id, after_state, reason
  ) values (
    v_payment.verified_by, 'admin', 'create_job_from_verified_deposit', 'job', v_job.id,
    jsonb_build_object(
      'payment_id', v_payment.id,
      'request_id', v_request.id,
      'quote_id', v_quote.id,
      'queue_entry_id', v_queue.id,
      'deposit_verified_at', v_payment.verified_at
    ),
    'Verified deposit converted to job'
  );

  return query select v_job.id, v_queue.id;
end;
$$;

create function public.gateway_create_job_from_verified_deposit(p_admin_user_id uuid, p_payment_id uuid)
returns table(job_id uuid, queue_entry_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce((select auth.jwt()) ->> 'role', '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from auth.users admin_user
    where admin_user.id = p_admin_user_id
      and lower(admin_user.email) = 'nasora.nsr300@gmail.com'
      and admin_user.raw_app_meta_data ->> 'role' = 'admin'
  ) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.payments payment
    where payment.id = p_payment_id and payment.verified_by = p_admin_user_id
  ) then
    raise exception 'payment_verifier_mismatch' using errcode = '42501';
  end if;
  return query select * from private.create_job_from_verified_deposit(p_payment_id);
end;
$$;

-- Manual Guest work remains a separate admin-only action because its agreement and
-- payment are handled outside the member workflow.
create function private.create_manual_guest_job(
  p_guest_display_name text,
  p_category_name jsonb,
  p_service_name jsonb,
  p_deadline date,
  p_total_satang bigint
)
returns table(job_id uuid, queue_entry_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workflow public.status_workflows%rowtype;
  v_status public.status_definitions%rowtype;
  v_job public.jobs%rowtype;
  v_queue public.queue_entries%rowtype;
begin
  if not private.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if nullif(btrim(p_guest_display_name), '') is null or p_total_satang < 0 then
    raise exception 'invalid_guest_job';
  end if;
  select workflow.* into v_workflow from public.status_workflows workflow
  where workflow.is_active and workflow.archived_at is null
  order by workflow.is_default desc, workflow.created_at limit 1;
  select status.* into v_status from public.status_definitions status
  where status.workflow_id = v_workflow.id and status.archived_at is null
  order by status.display_order, status.created_at limit 1;
  if v_status.id is null then raise exception 'initial_status_not_found'; end if;

  insert into public.jobs (
    customer_type, guest_display_name, guest_contact_snapshot, contact_snapshot,
    category_slug, category_name_snapshot, service_type_slug, service_type_name_snapshot,
    workflow_id, status_id, original_quote_total_satang, current_total_satang,
    deposit_percent, default_free_revisions, deadline
  ) values (
    'guest', btrim(p_guest_display_name), '{}'::jsonb, '{}'::jsonb,
    'manual-guest', p_category_name, 'manual-guest', p_service_name,
    v_workflow.id, v_status.id, p_total_satang, p_total_satang,
    0, 4, p_deadline
  ) returning * into v_job;
  insert into public.job_status_history (job_id, to_status_id, public_note, changed_by)
  values (v_job.id, v_status.id, 'Added by artist', auth.uid());
  insert into public.queue_entries (
    job_id, customer_display_name, category_name_snapshot, service_type_name_snapshot,
    status_label_snapshot, deadline, default_order_at
  ) values (
    v_job.id, v_job.guest_display_name, p_category_name, p_service_name,
    v_status.label, p_deadline, now()
  ) returning * into v_queue;
  insert into public.audit_logs (actor_user_id, actor_role, action, entity_type, entity_id, after_state, reason)
  values (auth.uid(), 'admin', 'create_manual_guest_job', 'job', v_job.id,
    jsonb_build_object('queue_entry_id', v_queue.id), 'Manual Guest job');
  return query select v_job.id, v_queue.id;
end;
$$;

create function public.admin_create_manual_guest_job(
  p_guest_display_name text,
  p_category_name jsonb,
  p_service_name jsonb,
  p_deadline date,
  p_total_satang bigint
)
returns table(job_id uuid, queue_entry_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  return query select * from private.create_manual_guest_job(
    p_guest_display_name, p_category_name, p_service_name, p_deadline, p_total_satang
  );
end;
$$;

-- Replace the legacy projection so public consumers cannot select category, IDs,
-- timestamps, contacts, quote/payment data, or member ownership.
drop view if exists public.public_queue;
create function public.read_public_queue()
returns table(
  position bigint,
  customer_display_name text,
  service_type_name_snapshot jsonb,
  status_label_snapshot jsonb,
  deadline date
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    row_number() over (order by queue.manual_rank nulls last, queue.default_order_at, queue.created_at)::bigint,
    queue.customer_display_name,
    queue.service_type_name_snapshot,
    queue.status_label_snapshot,
    queue.deadline
  from public.queue_entries queue
  where queue.is_visible and queue.archived_at is null
$$;

create view public.public_queue
with (security_invoker = true, security_barrier = true)
as
select
  queue.position,
  queue.customer_display_name,
  queue.service_type_name_snapshot,
  queue.status_label_snapshot,
  queue.deadline
from public.read_public_queue() queue;

revoke all on public.queue_entries from public, anon, authenticated;
revoke all on function public.read_public_queue() from public, anon, authenticated, service_role;
grant execute on function public.read_public_queue() to anon, authenticated;
grant select on public.public_queue to anon, authenticated;

-- Members can select only their own job/history rows through RLS, and the history
-- grant deliberately omits private_note. Guest jobs have user_id null and never match.
revoke all on public.jobs, public.job_status_history from authenticated;
grant select (
  id, request_id, accepted_quote_id, customer_type, user_id,
  member_display_name_snapshot, category_slug, category_name_snapshot,
  service_type_slug, service_type_name_snapshot, workflow_id, status_id,
  original_quote_total_satang, current_total_satang, deposit_percent,
  deposit_verified_at, default_free_revisions, deadline, work_started_at,
  completed_at, cancelled_at, archived_at, created_at, updated_at
) on public.jobs to authenticated;
grant select (
  id, job_id, from_status_id, to_status_id, public_note, changed_by, changed_at
) on public.job_status_history to authenticated;

revoke all on function private.create_job_from_verified_deposit(uuid),
  private.create_manual_guest_job(text, jsonb, jsonb, date, bigint)
  from public, anon, authenticated, service_role;
revoke all on function public.gateway_create_job_from_verified_deposit(uuid, uuid),
  public.admin_create_manual_guest_job(text, jsonb, jsonb, date, bigint)
  from public, anon, authenticated, service_role;
grant execute on function public.gateway_create_job_from_verified_deposit(uuid, uuid) to service_role;
grant execute on function public.admin_create_manual_guest_job(text, jsonb, jsonb, date, bigint) to authenticated;

-- Runtime transaction, RLS-role, and concurrency simulation must be run against a
-- deployed/local Supabase PostgreSQL instance; this migration is not applied here.

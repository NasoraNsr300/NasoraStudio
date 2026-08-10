-- Convert an already verified deposit into one durable job and queue entry.
-- The function body is one PostgreSQL transaction: any exception reverts every write.

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
  select payment_intent.* into v_payment_intent
  from public.payment_intents payment_intent
  where payment_intent.id = v_payment.intent_id
  for update;
  if not found or v_payment_intent.status <> 'verified' then
    raise exception 'verified_payment_intent_required';
  end if;

  -- Match quote authoring's request -> quote order. The request lock also prevents
  -- a paid request from changing state while its job snapshot is being created.
  select request.* into v_request
  from public.commission_requests request
  where request.id = v_payment.request_id
    and request.user_id = v_payment.user_id
    and request.requester_type = 'member'
  for update;
  if not found then
    raise exception 'member_request_not_found';
  end if;

  select job.* into v_job
  from public.jobs job
  where job.accepted_quote_id = v_payment.quote_id
  for update;
  if v_job.id is not null then
    select queue.* into v_queue
    from public.queue_entries queue
    where queue.job_id = v_job.id
    order by queue.created_at
    limit 1;
    if v_queue.id is null then
      raise exception 'converted_job_queue_missing';
    end if;
    return query select v_job.id, v_queue.id;
    return;
  end if;

  -- Installment/final replays are a successful no-op tied to the existing job.
  -- Reaching here means their prerequisite deposit job is missing.
  if v_payment.kind <> 'deposit' then
    raise exception 'deposit_job_not_found';
  end if;

  if v_request.status not in ('quoted', 'reviewing') then
    raise exception 'convertible_member_request_not_found';
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
  where status.workflow_id = v_workflow.id
    and status.archived_at is null
    and status.customer_visible
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

-- A quote is payable either before the deposit while it is the current sent quote,
-- or after conversion while the exact accepted quote belongs to the owner's job.
-- Accepted quotes deliberately ignore their pre-acceptance expiry timestamp.
create or replace function private.payment_quote_is_payable(
  p_quote_id uuid,
  p_request_id uuid,
  p_user_id uuid,
  p_intent_kind text default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.quotes quote
    join public.commission_requests request
      on request.id = quote.request_id
      and request.id = p_request_id
      and request.user_id = p_user_id
    where quote.id = p_quote_id
      and (
        (
          quote.status = 'sent'
          and (p_intent_kind is null or p_intent_kind = 'deposit')
          and (quote.expires_at is null or quote.expires_at > now())
          and not exists (
            select 1 from public.quotes newer
            where newer.request_id = quote.request_id and newer.version > quote.version
          )
        )
        or (
          quote.status = 'accepted'
          and (p_intent_kind is null or p_intent_kind in ('installment', 'final'))
          and exists (
            select 1
            from public.jobs job
            where job.accepted_quote_id = quote.id
              and job.request_id = quote.request_id
              and job.user_id = p_user_id
              and job.customer_type = 'member'
          )
          and exists (
            select 1
            from public.payments payment
            where payment.quote_id = quote.id
              and payment.request_id = quote.request_id
              and payment.user_id = p_user_id
              and payment.kind = 'deposit'
          )
        )
      )
  )
$$;

create or replace function private.create_payment_intent(
  p_quote_id uuid,
  p_request_id uuid,
  p_amount_satang bigint,
  p_idempotency_key uuid
)
returns table(intent_id uuid, amount_satang bigint, kind text, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote public.quotes%rowtype;
  v_request public.commission_requests%rowtype;
  v_existing public.payment_intents%rowtype;
  v_paid bigint;
  v_balance bigint;
  v_kind text;
  v_fingerprint text := concat_ws(':', p_quote_id, p_request_id, p_amount_satang);
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;

  select * into v_request
  from public.commission_requests request
  where request.id = p_request_id and request.user_id = auth.uid()
  for update;
  if not found then raise exception 'request_not_found'; end if;

  select * into v_existing
  from public.payment_intents intent
  where intent.user_id = auth.uid() and intent.idempotency_key = p_idempotency_key;
  if found then
    if v_existing.payload_fingerprint <> v_fingerprint then raise exception 'idempotency_payload_mismatch'; end if;
    if v_existing.status <> 'pending' then
      return query select v_existing.id, v_existing.amount_satang, v_existing.kind, v_existing.status;
      return;
    end if;
  end if;

  update public.payment_intents intent
  set status = 'closed'
  where intent.request_id = p_request_id
    and intent.status = 'pending'
    and not private.payment_quote_is_payable(intent.quote_id, intent.request_id, intent.user_id, intent.kind);

  select quote.* into v_quote
  from public.quotes quote
  where quote.id = p_quote_id
    and quote.request_id = p_request_id
    and private.payment_quote_is_payable(quote.id, quote.request_id, auth.uid(), null)
  for update;
  if not found then return; end if;

  if v_existing.id is not null then
    if not private.payment_quote_is_payable(v_existing.quote_id, v_existing.request_id, v_existing.user_id, v_existing.kind) then
      update public.payment_intents set status = 'closed' where id = v_existing.id;
      return;
    end if;
    return query select v_existing.id, v_existing.amount_satang, v_existing.kind, v_existing.status;
    return;
  end if;

  select coalesce(sum(payment.amount_satang), 0)::bigint into v_paid
  from public.payments payment
  where payment.quote_id = p_quote_id
    and payment.request_id = p_request_id
    and payment.user_id = auth.uid();
  v_balance := v_quote.total_satang - v_paid;
  if p_amount_satang is null or p_amount_satang <= 0 then raise exception 'invalid_satang'; end if;
  if p_amount_satang > v_balance then raise exception 'payment_exceeds_balance'; end if;
  if v_paid = 0 then
    if exists (
      select 1 from public.payments payment
      where payment.request_id = p_request_id and payment.kind = 'deposit'
    ) then raise exception 'deposit_already_verified_for_request'; end if;
    if p_amount_satang <> v_quote.deposit_satang then raise exception 'deposit_amount_mismatch'; end if;
    v_kind := 'deposit';
  elsif v_paid < v_quote.deposit_satang then
    raise exception 'invalid_payment_state';
  elsif p_amount_satang = v_balance then
    v_kind := 'final';
  elsif p_amount_satang < 10000 then
    raise exception 'payment_below_minimum';
  else
    v_kind := 'installment';
  end if;

  if v_quote.status = 'sent' and v_kind <> 'deposit' then
    raise exception 'invalid_payment_state';
  end if;
  if v_quote.status = 'accepted' and v_kind not in ('installment', 'final') then
    raise exception 'invalid_payment_state';
  end if;

  select * into v_existing
  from public.payment_intents intent
  where intent.quote_id = p_quote_id and intent.status = 'pending';
  if found then raise exception 'payment_intent_pending'; end if;

  insert into public.payment_intents (
    quote_id, request_id, user_id, kind, amount_satang, idempotency_key, payload_fingerprint
  ) values (
    p_quote_id, p_request_id, auth.uid(), v_kind, p_amount_satang, p_idempotency_key, v_fingerprint
  )
  returning id, public.payment_intents.amount_satang, public.payment_intents.kind, public.payment_intents.status
  into intent_id, amount_satang, kind, status;
  return next;
end;
$$;

create or replace function private.get_member_pending_payment_intent(
  p_quote_id uuid,
  p_request_id uuid
)
returns table(intent_id uuid, quote_id uuid, amount_satang bigint, kind text, status text, slip_status text)
language sql
stable
security definer
set search_path = ''
as $$
  select intent.id, intent.quote_id, intent.amount_satang, intent.kind, intent.status, latest_slip.status
  from public.payment_intents intent
  join public.commission_requests request
    on request.id = intent.request_id and request.user_id = auth.uid()
  join public.quotes quote
    on quote.id = intent.quote_id and quote.request_id = request.id
  left join lateral (
    select case
      when slip.status = 'authorized' and slip.lease_expires_at <= now() then 'failed'::text
      else slip.status
    end as status
    from public.payment_slips slip
    where slip.intent_id = intent.id
    order by slip.created_at desc, slip.id desc
    limit 1
  ) latest_slip on true
  where intent.quote_id = p_quote_id
    and intent.request_id = p_request_id
    and intent.user_id = auth.uid()
    and intent.status = 'pending'
    and private.payment_quote_is_payable(quote.id, quote.request_id, intent.user_id, intent.kind)
  order by intent.created_at desc
  limit 1
$$;

create or replace function private.authorize_payment_slip(
  p_user_id uuid,
  p_intent_id uuid,
  p_content_type text,
  p_size_bytes bigint,
  p_upload_key uuid,
  p_attempt_id uuid
)
returns table(
  slip_id uuid,
  object_key text,
  content_type text,
  size_bytes bigint,
  slip_status text,
  delete_after timestamptz,
  cleanup_attempt_id uuid,
  cleanup_object_key text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_intent public.payment_intents%rowtype;
  v_request public.commission_requests%rowtype;
  v_quote public.quotes%rowtype;
  v_slip public.payment_slips%rowtype;
  v_extension text;
  v_slip_id uuid := gen_random_uuid();
  v_object_key text;
  v_cleanup_attempt_id uuid;
  v_cleanup_object_key text;
  v_slip_found boolean;
begin
  if p_user_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_attempt_id is null then raise exception 'invalid_upload_attempt'; end if;
  if p_content_type not in ('image/png', 'image/jpeg', 'image/webp')
    or p_size_bytes not between 1 and 5242880
  then raise exception 'invalid_slip_metadata'; end if;

  v_extension := case p_content_type
    when 'image/jpeg' then 'jpg'
    when 'image/png' then 'png'
    else 'webp'
  end;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  with expired as (
    update public.payment_slips
    set status = 'failed', cleanup_required = true
    where user_id = p_user_id and status = 'authorized' and lease_expires_at <= now()
    returning attempt_id
  )
  update public.payment_slip_upload_attempts attempt
  set status = 'superseded', cleanup_required = true
  where attempt.attempt_id in (select expired.attempt_id from expired);

  select slip.* into v_slip
  from public.payment_slips slip
  where slip.user_id = p_user_id and slip.upload_key = p_upload_key
  for update;
  v_slip_found := found;

  select intent.* into v_intent
  from public.payment_intents intent
  where intent.id = p_intent_id and intent.user_id = p_user_id and intent.status = 'pending';
  if not found then raise exception 'payment_intent_not_found'; end if;

  -- Shared mutation order: request, intent, then quote.
  select request.* into v_request
  from public.commission_requests request
  where request.id = v_intent.request_id and request.user_id = p_user_id
  for update;
  if not found then raise exception 'request_not_found'; end if;

  select intent.* into v_intent
  from public.payment_intents intent
  where intent.id = p_intent_id
    and intent.request_id = v_request.id
    and intent.user_id = p_user_id
    and intent.status = 'pending'
  for update;
  if not found then raise exception 'payment_intent_not_found'; end if;

  select quote.* into v_quote
  from public.quotes quote
  where quote.id = v_intent.quote_id
    and quote.request_id = v_intent.request_id
    and private.payment_quote_is_payable(quote.id, quote.request_id, p_user_id, v_intent.kind)
  for update;
  if not found then
    update public.payment_intents set status = 'closed' where id = v_intent.id;
    return;
  end if;

  if v_slip_found then
    if v_slip.intent_id <> p_intent_id
      or v_slip.content_type <> p_content_type
      or v_slip.size_bytes <> p_size_bytes
    then raise exception 'idempotency_payload_mismatch'; end if;
    if v_slip.status = 'pending_review' then
      return query select
        v_slip.id, v_slip.object_key, v_slip.content_type, v_slip.size_bytes,
        v_slip.status, v_slip.delete_after, null::uuid, null::text;
      return;
    end if;
    if v_slip.status = 'authorized'
      and v_slip.attempt_id <> p_attempt_id
      and v_slip.lease_expires_at > now()
    then raise exception 'payment_slip_upload_in_progress'; end if;
    if v_slip.status not in ('authorized', 'failed') then raise exception 'payment_slip_not_uploadable'; end if;
    if v_slip.status = 'failed' or v_slip.lease_expires_at <= now() then
      if exists (
        select 1 from public.payment_slips other_slip
        where other_slip.intent_id = p_intent_id
          and other_slip.id <> v_slip.id
          and other_slip.status in ('authorized', 'pending_review')
      ) then raise exception 'payment_slip_active'; end if;
      v_cleanup_attempt_id := v_slip.attempt_id;
      v_cleanup_object_key := v_slip.object_key;
      update public.payment_slip_upload_attempts
      set status = 'superseded', cleanup_required = true
      where attempt_id = v_cleanup_attempt_id;
      if (
        select count(*) from public.payment_slip_upload_attempts attempt
        where attempt.user_id = p_user_id and attempt.created_at > now() - interval '1 hour'
      ) >= 5 then raise exception 'slip_upload_rate_limited'; end if;
      v_object_key := 'payment-slips/' || gen_random_uuid()::text || '.' || v_extension;
      update public.payment_slips
      set
        status = 'authorized',
        object_key = v_object_key,
        attempt_id = p_attempt_id,
        lease_expires_at = now() + interval '10 minutes',
        etag = null,
        cleanup_required = false,
        uploaded_at = now(),
        delete_after = now() + interval '30 days'
      where id = v_slip.id
      returning * into v_slip;
      insert into public.payment_slip_upload_attempts (
        attempt_id, slip_id, user_id, object_key, status
      ) values (
        p_attempt_id, v_slip.id, p_user_id, v_object_key, 'authorized'
      );
    end if;
    return query select
      v_slip.id, v_slip.object_key, v_slip.content_type, v_slip.size_bytes,
      v_slip.status, v_slip.delete_after, v_cleanup_attempt_id, v_cleanup_object_key;
    return;
  end if;

  if exists (
    select 1 from public.payment_slips slip
    where slip.intent_id = p_intent_id and slip.status in ('authorized', 'pending_review')
  ) then raise exception 'payment_slip_active'; end if;
  if (
    select count(*) from public.payment_slip_upload_attempts attempt
    where attempt.user_id = p_user_id and attempt.created_at > now() - interval '1 hour'
  ) >= 5 then raise exception 'slip_upload_rate_limited'; end if;

  v_object_key := 'payment-slips/' || gen_random_uuid()::text || '.' || v_extension;
  insert into public.payment_slips (
    id, intent_id, user_id, object_key, content_type, size_bytes,
    upload_key, attempt_id, lease_expires_at
  ) values (
    v_slip_id, p_intent_id, p_user_id, v_object_key, p_content_type, p_size_bytes,
    p_upload_key, p_attempt_id, now() + interval '10 minutes'
  ) returning * into v_slip;
  insert into public.payment_slip_upload_attempts (
    attempt_id, slip_id, user_id, object_key, status
  ) values (
    p_attempt_id, v_slip.id, p_user_id, v_object_key, 'authorized'
  );
  return query select
    v_slip.id, v_slip.object_key, v_slip.content_type, v_slip.size_bytes,
    v_slip.status, v_slip.delete_after, null::uuid, null::text;
end;
$$;

-- Replace Task 5's verification wrapper so deposit verification and job conversion
-- succeed or revert together. Non-deposit payments remain ledger-only.
create or replace function private.verify_payment_slip(
  p_admin_user_id uuid,
  p_payment_id uuid,
  p_decision text,
  p_reason text,
  p_verification_key uuid
)
returns table(payment_id uuid, intent_id uuid, slip_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slip public.payment_slips%rowtype;
  v_intent public.payment_intents%rowtype;
  v_payment public.payments%rowtype;
  v_request public.commission_requests%rowtype;
  v_quote public.quotes%rowtype;
  v_paid bigint;
  v_fingerprint text := concat_ws(':', p_decision, coalesce(nullif(btrim(p_reason), ''), ''));
begin
  if not exists (
    select 1 from auth.users admin_user where admin_user.id = p_admin_user_id
      and lower(admin_user.email) = 'nasora.nsr300@gmail.com'
      and admin_user.raw_app_meta_data ->> 'role' = 'admin'
  ) then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_decision not in ('approve', 'reject') or (p_decision = 'reject' and nullif(btrim(p_reason), '') is null) then
    raise exception 'invalid_verification';
  end if;

  select * into v_slip from public.payment_slips where id = p_payment_id for update;
  if not found then raise exception 'payment_slip_not_found'; end if;
  if v_slip.verification_key = p_verification_key then
    if v_slip.verification_payload_fingerprint <> v_fingerprint then raise exception 'idempotency_payload_mismatch'; end if;
    select * into v_payment from public.payments payment where payment.intent_id = v_slip.intent_id;
    return query select v_payment.id, v_slip.intent_id, v_slip.status;
    return;
  end if;
  if v_slip.status <> 'pending_review' or nullif(btrim(v_slip.etag), '') is null then
    raise exception 'payment_slip_not_reviewable';
  end if;

  select intent.* into v_intent
  from public.payment_intents intent
  where intent.id = v_slip.intent_id and intent.status = 'pending';
  if not found then raise exception 'payment_intent_not_found'; end if;

  -- Shared mutation order: request, intent, then quote.
  select request.* into v_request
  from public.commission_requests request
  where request.id = v_intent.request_id
    and request.user_id = v_intent.user_id
  for update;
  if not found then raise exception 'commission_request_not_found'; end if;

  select intent.* into v_intent
  from public.payment_intents intent
  where intent.id = v_slip.intent_id
    and intent.request_id = v_request.id
    and intent.user_id = v_request.user_id
    and intent.status = 'pending'
  for update;
  if not found then raise exception 'payment_intent_not_found'; end if;

  select * into v_quote from public.quotes quote
  where quote.id = v_intent.quote_id
    and quote.request_id = v_intent.request_id
    and private.payment_quote_is_payable(
      quote.id, quote.request_id, v_intent.user_id, v_intent.kind
    )
  for update;
  if not found then
    update public.payment_slips set status = 'stale', reviewed_by = p_admin_user_id, reviewed_at = now(),
      rejection_reason = 'quote_not_payable', verification_key = p_verification_key,
      verification_payload_fingerprint = v_fingerprint where id = v_slip.id;
    update public.payment_intents set status = 'closed' where id = v_intent.id;
    return query select null::uuid, v_intent.id, 'stale'::text;
    return;
  end if;

  if p_decision = 'reject' then
    update public.payment_slips set status = 'rejected', reviewed_by = p_admin_user_id, reviewed_at = now(),
      rejection_reason = btrim(p_reason), verification_key = p_verification_key,
      verification_payload_fingerprint = v_fingerprint where id = v_slip.id;
    update public.payment_intents set status = 'pending' where id = v_intent.id;
    return query select null::uuid, v_intent.id, 'rejected'::text;
    return;
  end if;

  select coalesce(sum(payment.amount_satang), 0)::bigint into v_paid
  from public.payments payment
  where payment.quote_id = v_intent.quote_id
    and payment.request_id = v_intent.request_id
    and payment.user_id = v_intent.user_id;
  if v_intent.amount_satang > v_quote.total_satang - v_paid then raise exception 'payment_exceeds_balance'; end if;
  if v_intent.kind = 'deposit' and exists (
    select 1 from public.payments payment
    where payment.request_id = v_intent.request_id and payment.kind = 'deposit'
  ) then raise exception 'deposit_already_verified_for_request'; end if;

  insert into public.payments (
    intent_id, quote_id, request_id, user_id, kind, amount_satang, verified_by, verified_at
  ) values (
    v_intent.id, v_intent.quote_id, v_intent.request_id, v_intent.user_id,
    v_intent.kind, v_intent.amount_satang, p_admin_user_id, now()
  ) on conflict (intent_id) do nothing returning * into v_payment;
  if v_payment.id is null then
    select * into v_payment from public.payments payment where payment.intent_id = v_intent.id;
  end if;
  update public.payment_slips set status = 'approved', reviewed_by = p_admin_user_id,
    reviewed_at = v_payment.verified_at, rejection_reason = null,
    verification_key = p_verification_key, verification_payload_fingerprint = v_fingerprint
  where id = v_slip.id;
  update public.payment_intents set status = 'verified', verified_at = v_payment.verified_at
  where id = v_intent.id;
  return query select v_payment.id, v_intent.id, 'approved'::text;
end;
$$;

create or replace function public.gateway_verify_payment_slip(
  p_admin_user_id uuid,
  p_payment_id uuid,
  p_decision text,
  p_reason text,
  p_verification_key uuid
)
returns table(payment_id uuid, intent_id uuid, slip_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result record;
begin
  if coalesce((select auth.jwt()) ->> 'role', '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  select verification.* into v_result
  from private.verify_payment_slip(
    p_admin_user_id, p_payment_id, p_decision, p_reason, p_verification_key
  ) verification;

  if v_result.slip_status = 'approved'
    and v_result.payment_id is not null
    and exists (
      select 1 from public.payments payment
      where payment.id = v_result.payment_id and payment.kind = 'deposit'
    )
  then
    perform private.create_job_from_verified_deposit(v_result.payment_id);
  end if;

  return query select v_result.payment_id, v_result.intent_id, v_result.slip_status;
end;
$$;

-- A verified deposit freezes the paid quote/request until the same transaction
-- converts them. This also protects deposits verified before this migration.
create function private.protect_verified_deposit_conversion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'quotes'
    and new.status is distinct from old.status
    and new.status <> 'accepted'
    and exists (
      select 1 from public.payments payment
      where payment.quote_id = old.id and payment.kind = 'deposit'
    )
  then
    raise exception 'verified_deposit_conversion_required';
  end if;

  if tg_table_name = 'commission_requests'
    and new.status is distinct from old.status
    and new.status <> 'converted'
    and exists (
      select 1 from public.payments payment
      where payment.request_id = old.id and payment.kind = 'deposit'
    )
  then
    raise exception 'verified_deposit_conversion_required';
  end if;

  return new;
end;
$$;

create trigger quotes_protect_verified_deposit
before update of status on public.quotes
for each row execute function private.protect_verified_deposit_conversion();

create trigger requests_protect_verified_deposit
before update of status on public.commission_requests
for each row execute function private.protect_verified_deposit_conversion();

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
  where status.workflow_id = v_workflow.id and status.archived_at is null and status.customer_visible
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

create or replace function private.change_job_status(
  p_job_id uuid,
  p_new_status_id uuid,
  p_public_note text default null,
  p_private_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.jobs%rowtype;
  v_after public.jobs%rowtype;
  v_status public.status_definitions%rowtype;
begin
  if not private.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  select * into v_before from public.jobs where id = p_job_id for update;
  if not found then raise exception 'job_not_found'; end if;

  select * into v_status
  from public.status_definitions
  where id = p_new_status_id and archived_at is null;
  if not found or v_status.workflow_id <> v_before.workflow_id then
    raise exception 'status_not_in_job_workflow';
  end if;

  insert into public.job_status_history (
    job_id, from_status_id, to_status_id, public_note, private_note, changed_by
  ) values (
    p_job_id, v_before.status_id, p_new_status_id, p_public_note, p_private_note, auth.uid()
  );

  update public.jobs
  set
    status_id = p_new_status_id,
    work_started_at = case when v_status.starts_work and work_started_at is null then now() else work_started_at end,
    completed_at = case when v_status.stable_key = 'completed' then now() else completed_at end,
    cancelled_at = case when v_status.stable_key = 'cancelled' then now() else cancelled_at end
  where id = p_job_id
  returning * into v_after;

  -- Private workflow states are retained in member-owned history only. The public
  -- queue keeps its last customer-visible snapshot until another visible state.
  if v_status.customer_visible then
    update public.queue_entries
    set
      status_label_snapshot = v_status.label
    where job_id = p_job_id and archived_at is null;
  end if;

  -- Terminal work leaves the active queue even when its final internal status is
  -- intentionally hidden. The last safe public label remains unchanged.
  if v_status.is_terminal then
    update public.queue_entries
    set archived_at = coalesce(archived_at, now())
    where job_id = p_job_id and archived_at is null;
  end if;

  insert into public.audit_logs (
    actor_user_id, actor_role, action, entity_type, entity_id,
    before_state, after_state, reason
  ) values (
    auth.uid(), 'admin', 'change_status', 'job', p_job_id,
    to_jsonb(v_before), to_jsonb(v_after), p_private_note
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
  member_display_name_snapshot, guest_display_name, category_slug, category_name_snapshot,
  service_type_slug, service_type_name_snapshot, workflow_id, status_id,
  original_quote_total_satang, current_total_satang, deposit_percent,
  deposit_verified_at, default_free_revisions, deadline, work_started_at,
  completed_at, cancelled_at, archived_at, created_at, updated_at
) on public.jobs to authenticated;
grant select (
  id, job_id, from_status_id, to_status_id, public_note, changed_by, changed_at
) on public.job_status_history to authenticated;

revoke all on function private.create_job_from_verified_deposit(uuid),
  private.payment_quote_is_payable(uuid, uuid, uuid, text),
  private.create_payment_intent(uuid, uuid, bigint, uuid),
  private.get_member_pending_payment_intent(uuid, uuid),
  private.authorize_payment_slip(uuid, uuid, text, bigint, uuid, uuid),
  private.verify_payment_slip(uuid, uuid, text, text, uuid),
  private.create_manual_guest_job(text, jsonb, jsonb, date, bigint),
  private.protect_verified_deposit_conversion(),
  private.change_job_status(uuid, uuid, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.gateway_create_job_from_verified_deposit(uuid, uuid),
  public.admin_create_manual_guest_job(text, jsonb, jsonb, date, bigint),
  public.gateway_verify_payment_slip(uuid, uuid, text, text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.gateway_create_job_from_verified_deposit(uuid, uuid) to service_role;
grant execute on function public.gateway_verify_payment_slip(uuid, uuid, text, text, uuid) to service_role;
grant execute on function public.admin_create_manual_guest_job(text, jsonb, jsonb, date, bigint) to authenticated;

-- Customer-facing identities can read only public workflow definitions. The
-- broad grants from the core migration are replaced with safe columns so the
-- Data API can never return private_description to a member.
drop policy if exists status_definitions_select_authenticated on public.status_definitions;
create policy status_definitions_select_authenticated
on public.status_definitions for select to authenticated
using ((select private.is_admin()) or (customer_visible and archived_at is null));

drop policy if exists job_status_history_select_own on public.job_status_history;
create policy job_status_history_select_own
on public.job_status_history for select to authenticated
using (
  (select private.is_admin()) or (
    exists (
      select 1 from public.jobs job
      where job.id = job_id and job.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.status_definitions status
      where status.id = to_status_id and status.customer_visible
    )
  )
);

revoke all on public.status_definitions from anon, authenticated;
grant select (
  id, workflow_id, stable_key, label, display_order, customer_visible,
  starts_work, is_terminal, created_at, updated_at, archived_at
) on public.status_definitions to authenticated;
grant insert, update, delete on public.status_definitions to authenticated;

-- Admin Jobs uses an exact-admin guarded RPC because hidden status labels and
-- Guest display snapshots must not be exposed through member table grants.
create function public.admin_list_jobs()
returns table(
  id uuid,
  customer_type text,
  member_display_name_snapshot text,
  guest_display_name text,
  service_type_name_snapshot jsonb,
  deadline date,
  deposit_verified_at timestamptz,
  status_key text,
  status_label jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  return query
  select
    job.id,
    job.customer_type,
    job.member_display_name_snapshot,
    job.guest_display_name,
    job.service_type_name_snapshot,
    job.deadline,
    job.deposit_verified_at,
    status.stable_key,
    status.label
  from public.jobs job
  join public.status_definitions status on status.id = job.status_id
  order by job.deposit_verified_at nulls last, job.created_at, job.id;
end;
$$;

-- Replace the owner job projection once Admin Jobs no longer depends on direct
-- table access. Internal workflow IDs and Guest snapshots remain server-only.
revoke all on public.jobs from authenticated;
grant select (
  id, request_id, accepted_quote_id, customer_type, user_id,
  member_display_name_snapshot, category_slug, category_name_snapshot,
  service_type_slug, service_type_name_snapshot,
  original_quote_total_satang, current_total_satang, deposit_percent,
  deposit_verified_at, default_free_revisions, deadline, work_started_at,
  completed_at, cancelled_at, archived_at, created_at, updated_at
) on public.jobs to authenticated;

revoke all on function public.admin_list_jobs() from public, anon, authenticated, service_role;
grant execute on function public.admin_list_jobs() to authenticated;

-- Runtime transaction, RLS-role, and concurrency simulation must be run against a
-- deployed/local Supabase PostgreSQL instance; this migration is not applied here.

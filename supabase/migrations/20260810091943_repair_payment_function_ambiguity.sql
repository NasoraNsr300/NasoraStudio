create or replace function private.finalize_payment_slip(
  p_user_id uuid,
  p_slip_id uuid,
  p_attempt_id uuid,
  p_etag text,
  p_content_type text,
  p_size_bytes bigint,
  p_upload_key uuid
)
returns table(slip_id uuid, slip_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slip public.payment_slips%rowtype;
  v_etag text := nullif(btrim(p_etag), '');
begin
  if p_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if v_etag is null then raise exception 'etag_required_for_review'; end if;

  select * into v_slip
  from public.payment_slips
  where id = p_slip_id and user_id = p_user_id
  for update;

  if not found then raise exception 'payment_slip_not_found'; end if;
  if v_slip.attempt_id <> p_attempt_id then raise exception 'payment_slip_attempt_lost'; end if;
  if v_slip.upload_key <> p_upload_key
    or v_slip.content_type <> p_content_type
    or v_slip.size_bytes <> p_size_bytes then
    raise exception 'idempotency_payload_mismatch';
  end if;
  if v_slip.status = 'pending_review' then
    if v_slip.etag <> v_etag then raise exception 'idempotency_payload_mismatch'; end if;
    return query select v_slip.id, v_slip.status;
    return;
  end if;
  if v_slip.lease_expires_at <= now() then raise exception 'payment_slip_attempt_lost'; end if;
  if v_slip.status <> 'authorized' then raise exception 'payment_slip_not_found'; end if;

  update public.payment_slips
  set
    status = 'pending_review',
    etag = v_etag,
    cleanup_required = false,
    uploaded_at = now(),
    delete_after = now() + interval '30 days'
  where id = v_slip.id
  returning id, public.payment_slips.status into slip_id, slip_status;

  update public.payment_slip_upload_attempts as attempt
  set status = 'pending_review', cleanup_required = false, finalized_at = now()
  where attempt.attempt_id = p_attempt_id and attempt.slip_id = v_slip.id;

  return next;
end;
$$;

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
    select 1
    from auth.users admin_user
    where admin_user.id = p_admin_user_id
      and lower(admin_user.email) = 'nasora.nsr300@gmail.com'
      and admin_user.raw_app_meta_data ->> 'role' = 'admin'
  ) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_decision not in ('approve', 'reject')
    or (p_decision = 'reject' and nullif(btrim(p_reason), '') is null) then
    raise exception 'invalid_verification';
  end if;

  select * into v_slip
  from public.payment_slips
  where id = p_payment_id
  for update;
  if not found then raise exception 'payment_slip_not_found'; end if;

  if v_slip.verification_key = p_verification_key then
    if v_slip.verification_payload_fingerprint <> v_fingerprint then
      raise exception 'idempotency_payload_mismatch';
    end if;
    select * into v_payment
    from public.payments payment
    where payment.intent_id = v_slip.intent_id;
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

  select request.* into v_request
  from public.commission_requests request
  where request.id = v_intent.request_id and request.user_id = v_intent.user_id
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

  select * into v_quote
  from public.quotes quote
  where quote.id = v_intent.quote_id
    and quote.request_id = v_intent.request_id
    and private.payment_quote_is_payable(
      quote.id, quote.request_id, v_intent.user_id, v_intent.kind
    )
  for update;

  if not found then
    update public.payment_slips
    set
      status = 'stale',
      reviewed_by = p_admin_user_id,
      reviewed_at = now(),
      rejection_reason = 'quote_not_payable',
      verification_key = p_verification_key,
      verification_payload_fingerprint = v_fingerprint
    where id = v_slip.id;
    update public.payment_intents set status = 'closed' where id = v_intent.id;
    return query select null::uuid, v_intent.id, 'stale'::text;
    return;
  end if;

  if p_decision = 'reject' then
    update public.payment_slips
    set
      status = 'rejected',
      reviewed_by = p_admin_user_id,
      reviewed_at = now(),
      rejection_reason = btrim(p_reason),
      verification_key = p_verification_key,
      verification_payload_fingerprint = v_fingerprint
    where id = v_slip.id;
    update public.payment_intents set status = 'pending' where id = v_intent.id;
    return query select null::uuid, v_intent.id, 'rejected'::text;
    return;
  end if;

  select coalesce(sum(payment.amount_satang), 0)::bigint into v_paid
  from public.payments payment
  where payment.quote_id = v_intent.quote_id
    and payment.request_id = v_intent.request_id
    and payment.user_id = v_intent.user_id;

  if v_intent.amount_satang > v_quote.total_satang - v_paid then
    raise exception 'payment_exceeds_balance';
  end if;
  if v_intent.kind = 'deposit' and exists (
    select 1 from public.payments payment
    where payment.request_id = v_intent.request_id and payment.kind = 'deposit'
  ) then
    raise exception 'deposit_already_verified_for_request';
  end if;

  insert into public.payments (
    intent_id, quote_id, request_id, user_id, kind, amount_satang, verified_by, verified_at
  ) values (
    v_intent.id, v_intent.quote_id, v_intent.request_id, v_intent.user_id,
    v_intent.kind, v_intent.amount_satang, p_admin_user_id, now()
  )
  on conflict on constraint payments_intent_id_key do nothing
  returning * into v_payment;

  if v_payment.id is null then
    select * into v_payment
    from public.payments payment
    where payment.intent_id = v_intent.id;
  end if;

  update public.payment_slips
  set
    status = 'approved',
    reviewed_by = p_admin_user_id,
    reviewed_at = v_payment.verified_at,
    rejection_reason = null,
    verification_key = p_verification_key,
    verification_payload_fingerprint = v_fingerprint
  where id = v_slip.id;
  update public.payment_intents
  set status = 'verified', verified_at = v_payment.verified_at
  where id = v_intent.id;

  return query select v_payment.id, v_intent.id, 'approved'::text;
end;
$$;

revoke all on function private.finalize_payment_slip(uuid, uuid, uuid, text, text, bigint, uuid),
  private.verify_payment_slip(uuid, uuid, text, text, uuid)
from public, anon, authenticated, service_role;

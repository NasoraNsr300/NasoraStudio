-- Payment slip objects remain private in R2 under payment-slips/. Configure an R2 lifecycle
-- rule for that prefix to delete objects after 30 days; deployment is intentionally external
-- to this migration and Cloudflare may apply lifecycle deletion up to 24 hours later.

create table public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete restrict,
  request_id uuid not null references public.commission_requests(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  kind text not null check (kind in ('deposit', 'installment', 'final')),
  amount_satang bigint not null check (amount_satang > 0),
  status text not null default 'pending' check (status in ('pending', 'verified', 'closed')),
  idempotency_key uuid not null,
  payload_fingerprint text not null,
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  constraint payment_intent_request_quote_unique unique (id, quote_id, request_id),
  constraint payment_intent_user_idempotency_unique unique (user_id, idempotency_key)
);

create unique index payment_intents_one_pending_per_quote
  on public.payment_intents (quote_id)
  where status = 'pending';
create index payment_intents_owner_created_idx on public.payment_intents (user_id, created_at desc);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null unique references public.payment_intents(id) on delete restrict,
  quote_id uuid not null references public.quotes(id) on delete restrict,
  request_id uuid not null references public.commission_requests(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  kind text not null check (kind in ('deposit', 'installment', 'final')),
  amount_satang bigint not null check (amount_satang > 0),
  verified_by uuid not null references auth.users(id) on delete restrict,
  verified_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index payments_quote_verified_idx on public.payments (quote_id, verified_at);
create index payments_owner_verified_idx on public.payments (user_id, verified_at desc);

create table public.payment_slips (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references public.payment_intents(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  object_key text not null unique check (object_key like 'payment-slips/%'),
  content_type text not null check (content_type in ('image/png', 'image/jpeg', 'image/webp')),
  size_bytes bigint not null check (size_bytes between 1 and 5242880),
  etag text,
  status text not null default 'authorized' check (status in ('authorized', 'pending_review', 'approved', 'rejected')),
  upload_key uuid not null,
  uploaded_at timestamptz not null default now(),
  delete_after timestamptz not null default (now() + interval '30 days'),
  reviewed_by uuid references auth.users(id) on delete restrict,
  reviewed_at timestamptz,
  rejection_reason text,
  verification_key uuid,
  created_at timestamptz not null default now(),
  constraint payment_slip_owner_upload_unique unique (user_id, upload_key),
  constraint payment_slip_review_state check (
    (status in ('authorized', 'pending_review') and reviewed_by is null and reviewed_at is null)
    or (status = 'approved' and reviewed_by is not null and reviewed_at is not null and rejection_reason is null)
    or (status = 'rejected' and reviewed_by is not null and reviewed_at is not null and rejection_reason is not null)
  )
);

create index payment_slips_pending_review_idx on public.payment_slips (status, uploaded_at) where status = 'pending_review';

alter table public.payment_intents enable row level security;
alter table public.payments enable row level security;
alter table public.payment_slips enable row level security;

create policy payment_intents_select_own on public.payment_intents for select to authenticated
using ((select private.is_admin()) or user_id = (select auth.uid()));
create policy payments_select_own on public.payments for select to authenticated
using ((select private.is_admin()) or user_id = (select auth.uid()));
create policy payment_slips_select_own on public.payment_slips for select to authenticated
using ((select private.is_admin()) or user_id = (select auth.uid()));

revoke all on public.payment_intents, public.payments, public.payment_slips from public, anon, authenticated;
grant select (id, quote_id, request_id, user_id, kind, amount_satang, status, created_at, verified_at)
  on public.payment_intents to authenticated;
grant select (id, intent_id, quote_id, request_id, user_id, kind, amount_satang, verified_at, created_at)
  on public.payments to authenticated;
grant select (id, intent_id, user_id, object_key, content_type, size_bytes, etag, status, uploaded_at, delete_after, reviewed_at, rejection_reason, created_at)
  on public.payment_slips to authenticated;

create function private.payments_prevent_mutation() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'verified_payments_are_append_only';
end;
$$;

create trigger payments_prevent_mutation before update or delete on public.payments
for each row execute function private.payments_prevent_mutation();

create function private.create_payment_intent(
  p_quote_id uuid,
  p_request_id uuid,
  p_amount_satang bigint,
  p_idempotency_key uuid
) returns table(intent_id uuid, amount_satang bigint, kind text, status text)
language plpgsql security definer set search_path = '' as $$
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

  select * into v_request from public.commission_requests where id = p_request_id and user_id = auth.uid();
  if not found then raise exception 'request_not_found'; end if;
  select * into v_quote from public.quotes where id = p_quote_id and request_id = p_request_id and status in ('sent', 'accepted') for update;
  if not found then raise exception 'quote_not_payable'; end if;

  select * into v_existing from public.payment_intents as intent where intent.user_id = auth.uid() and intent.idempotency_key = p_idempotency_key;
  if found then
    if v_existing.payload_fingerprint <> v_fingerprint then raise exception 'idempotency_payload_mismatch'; end if;
    return query select v_existing.id, v_existing.amount_satang, v_existing.kind, v_existing.status;
    return;
  end if;

  select coalesce(sum(payment.amount_satang), 0)::bigint into v_paid from public.payments payment where payment.quote_id = p_quote_id;
  v_balance := v_quote.total_satang - v_paid;
  if p_amount_satang is null or p_amount_satang <= 0 then raise exception 'invalid_satang'; end if;
  if p_amount_satang > v_balance then raise exception 'payment_exceeds_balance'; end if;
  if v_paid = 0 then
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

  select * into v_existing from public.payment_intents as intent where intent.quote_id = p_quote_id and intent.status = 'pending';
  if found then
    if v_existing.amount_satang <> p_amount_satang or v_existing.kind <> v_kind then raise exception 'payment_intent_pending'; end if;
    return query select v_existing.id, v_existing.amount_satang, v_existing.kind, v_existing.status; return;
  end if;

  insert into public.payment_intents (quote_id, request_id, user_id, kind, amount_satang, idempotency_key, payload_fingerprint)
  values (p_quote_id, p_request_id, auth.uid(), v_kind, p_amount_satang, p_idempotency_key, v_fingerprint)
  returning id, public.payment_intents.amount_satang, public.payment_intents.kind, public.payment_intents.status
  into intent_id, amount_satang, kind, status;
  return next;
end;
$$;

create function private.authorize_payment_slip(
  p_intent_id uuid, p_object_key text, p_content_type text, p_size_bytes bigint, p_upload_key uuid
) returns table(slip_id uuid, object_key text, uploaded_at timestamptz, delete_after timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_intent public.payment_intents%rowtype; v_slip public.payment_slips%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_object_key not like 'payment-slips/%' or p_content_type not in ('image/png', 'image/jpeg', 'image/webp') or p_size_bytes not between 1 and 5242880 then raise exception 'invalid_slip_metadata'; end if;
  select * into v_intent from public.payment_intents where id = p_intent_id and user_id = auth.uid() and status = 'pending';
  if not found then raise exception 'payment_intent_not_found'; end if;
  select * into v_slip from public.payment_slips as slip where slip.user_id = auth.uid() and slip.upload_key = p_upload_key;
  if found then
    if v_slip.intent_id <> p_intent_id or v_slip.content_type <> p_content_type or v_slip.size_bytes <> p_size_bytes then raise exception 'idempotency_payload_mismatch'; end if;
  else
    insert into public.payment_slips (intent_id, user_id, object_key, content_type, size_bytes, upload_key)
    values (p_intent_id, auth.uid(), p_object_key, p_content_type, p_size_bytes, p_upload_key) returning * into v_slip;
  end if;
  return query select v_slip.id, v_slip.object_key, v_slip.uploaded_at, v_slip.delete_after;
end;
$$;

create function private.confirm_payment_slip(p_slip_id uuid, p_etag text)
returns table(slip_id uuid, status text)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  update public.payment_slips set status = 'pending_review', etag = nullif(btrim(p_etag), ''), uploaded_at = now(), delete_after = now() + interval '30 days'
  where id = p_slip_id and user_id = auth.uid() and status in ('authorized', 'pending_review')
  returning id, public.payment_slips.status into slip_id, status;
  if not found then raise exception 'payment_slip_not_found'; end if;
  return next;
end;
$$;

create function private.verify_payment_slip(
  p_payment_id uuid, p_decision text, p_reason text, p_verification_key uuid
) returns table(payment_id uuid, intent_id uuid, slip_status text)
language plpgsql security definer set search_path = '' as $$
declare v_slip public.payment_slips%rowtype; v_intent public.payment_intents%rowtype; v_payment public.payments%rowtype; v_quote public.quotes%rowtype; v_paid bigint;
begin
  if not private.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_decision not in ('approve', 'reject') or (p_decision = 'reject' and nullif(btrim(p_reason), '') is null) then raise exception 'invalid_verification'; end if;
  select * into v_slip from public.payment_slips where id = p_payment_id for update;
  if not found then raise exception 'payment_slip_not_found'; end if;
  if v_slip.verification_key = p_verification_key and v_slip.status in ('approved', 'rejected') then
    select * into v_payment from public.payments as payment where payment.intent_id = v_slip.intent_id;
    return query select v_payment.id, v_slip.intent_id, v_slip.status; return;
  end if;
  if v_slip.status <> 'pending_review' then raise exception 'payment_slip_not_reviewable'; end if;
  select * into v_intent from public.payment_intents where id = v_slip.intent_id and status = 'pending' for update;
  if not found then raise exception 'payment_intent_not_found'; end if;

  if p_decision = 'reject' then
    update public.payment_slips set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), rejection_reason = btrim(p_reason), verification_key = p_verification_key where id = v_slip.id;
    update public.payment_intents set status = 'pending' where id = v_intent.id;
    return query select null::uuid, v_intent.id, 'rejected'::text; return;
  end if;

  select * into v_quote from public.quotes where id = v_intent.quote_id for update;
  select coalesce(sum(payment.amount_satang), 0)::bigint into v_paid from public.payments as payment where payment.quote_id = v_intent.quote_id;
  if v_intent.amount_satang > v_quote.total_satang - v_paid then raise exception 'payment_exceeds_balance'; end if;

  insert into public.payments (intent_id, quote_id, request_id, user_id, kind, amount_satang, verified_by, verified_at)
  values (v_intent.id, v_intent.quote_id, v_intent.request_id, v_intent.user_id, v_intent.kind, v_intent.amount_satang, auth.uid(), now())
  on conflict (intent_id) do nothing returning * into v_payment;
  if v_payment.id is null then select * into v_payment from public.payments as payment where payment.intent_id = v_intent.id; end if;
  update public.payment_slips set status = 'approved', reviewed_by = auth.uid(), reviewed_at = v_payment.verified_at, rejection_reason = null, verification_key = p_verification_key where id = v_slip.id;
  update public.payment_intents set status = 'verified', verified_at = v_payment.verified_at where id = v_intent.id;
  return query select v_payment.id, v_intent.id, 'approved'::text;
end;
$$;

create function public.member_create_payment_intent(p_quote_id uuid, p_request_id uuid, p_amount_satang bigint, p_idempotency_key uuid)
returns table(intent_id uuid, amount_satang bigint, kind text, status text)
language sql security invoker set search_path = '' as $$ select * from private.create_payment_intent(p_quote_id, p_request_id, p_amount_satang, p_idempotency_key); $$;
create function public.member_authorize_payment_slip(p_intent_id uuid, p_object_key text, p_content_type text, p_size_bytes bigint, p_upload_key uuid)
returns table(slip_id uuid, object_key text, uploaded_at timestamptz, delete_after timestamptz)
language sql security invoker set search_path = '' as $$ select * from private.authorize_payment_slip(p_intent_id, p_object_key, p_content_type, p_size_bytes, p_upload_key); $$;
create function public.member_confirm_payment_slip(p_slip_id uuid, p_etag text)
returns table(slip_id uuid, status text)
language sql security invoker set search_path = '' as $$ select * from private.confirm_payment_slip(p_slip_id, p_etag); $$;
create function public.admin_verify_payment_slip(p_payment_id uuid, p_decision text, p_reason text, p_verification_key uuid)
returns table(payment_id uuid, intent_id uuid, slip_status text)
language sql security invoker set search_path = '' as $$ select * from private.verify_payment_slip(p_payment_id, p_decision, p_reason, p_verification_key); $$;

revoke all on function private.payments_prevent_mutation(), private.create_payment_intent(uuid, uuid, bigint, uuid), private.authorize_payment_slip(uuid, text, text, bigint, uuid), private.confirm_payment_slip(uuid, text), private.verify_payment_slip(uuid, text, text, uuid) from public, anon;
revoke all on function public.member_create_payment_intent(uuid, uuid, bigint, uuid), public.member_authorize_payment_slip(uuid, text, text, bigint, uuid), public.member_confirm_payment_slip(uuid, text), public.admin_verify_payment_slip(uuid, text, text, uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.create_payment_intent(uuid, uuid, bigint, uuid), private.authorize_payment_slip(uuid, text, text, bigint, uuid), private.confirm_payment_slip(uuid, text), private.verify_payment_slip(uuid, text, text, uuid) to authenticated;
grant execute on function public.member_create_payment_intent(uuid, uuid, bigint, uuid), public.member_authorize_payment_slip(uuid, text, text, bigint, uuid), public.member_confirm_payment_slip(uuid, text), public.admin_verify_payment_slip(uuid, text, text, uuid) to authenticated;

-- Runtime RLS role simulation and function execution are verified in deployed Supabase environments.

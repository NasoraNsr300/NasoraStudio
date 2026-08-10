-- Payment slip objects remain private in R2 under payment-slips/. Configure an R2 lifecycle
-- rule for that prefix to delete objects after 30 days; deployment is intentionally external
-- to this migration and Cloudflare may apply lifecycle deletion up to 24 hours later.

create or replace function private.is_admin() returns boolean
language sql stable security invoker set search_path = '' as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
    and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'nasora.nsr300@gmail.com';
$$;

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
  on public.payment_intents (quote_id) where status = 'pending';
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

create unique index payments_one_deposit_per_request
  on public.payments (request_id) where kind = 'deposit';
create index payments_quote_verified_idx on public.payments (quote_id, verified_at);
create index payments_owner_verified_idx on public.payments (user_id, verified_at desc);

create table public.payment_slips (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references public.payment_intents(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  object_key text not null unique check (
    object_key ~ '^payment-slips/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|webp)$'
  ),
  content_type text not null check (content_type in ('image/png', 'image/jpeg', 'image/webp')),
  size_bytes bigint not null check (size_bytes between 1 and 5242880),
  etag text,
  status text not null default 'authorized' check (status in ('authorized', 'pending_review', 'approved', 'rejected', 'failed', 'stale')),
  upload_key uuid not null,
  attempt_id uuid not null default gen_random_uuid(),
  lease_expires_at timestamptz not null default (now() + interval '10 minutes'),
  uploaded_at timestamptz not null default now(),
  delete_after timestamptz not null default (now() + interval '30 days'),
  reviewed_by uuid references auth.users(id) on delete restrict,
  reviewed_at timestamptz,
  rejection_reason text,
  verification_key uuid,
  verification_payload_fingerprint text,
  cleanup_required boolean not null default false,
  created_at timestamptz not null default now(),
  constraint payment_slip_owner_upload_unique unique (user_id, upload_key),
  constraint payment_slip_review_state check (
    (status in ('authorized', 'pending_review', 'failed') and reviewed_by is null and reviewed_at is null)
    or (status = 'approved' and reviewed_by is not null and reviewed_at is not null and rejection_reason is null)
    or (status in ('rejected', 'stale') and reviewed_by is not null and reviewed_at is not null)
  ),
  constraint payment_slip_etag_required_for_review check (
    status in ('authorized', 'failed') or nullif(btrim(etag), '') is not null
  ),
  constraint payment_slip_cleanup_state check (not cleanup_required or status = 'failed')
);

create unique index payment_slips_one_active_per_intent
  on public.payment_slips (intent_id) where status in ('authorized', 'pending_review');
create index payment_slips_pending_review_idx
  on public.payment_slips (status, uploaded_at, id) where status = 'pending_review';
create index payment_slips_cleanup_required_idx
  on public.payment_slips (created_at) where cleanup_required;

-- Keep every object key durable even when a new lease supersedes the current attempt.
-- This table is server-only; members receive only the projected slip status above.
create table public.payment_slip_upload_attempts (
  attempt_id uuid primary key,
  slip_id uuid not null references public.payment_slips(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  object_key text not null unique check (
    object_key ~ '^payment-slips/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|webp)$'
  ),
  status text not null check (status in ('authorized', 'pending_review', 'failed', 'superseded', 'deleted')),
  cleanup_required boolean not null default false,
  created_at timestamptz not null default now(),
  finalized_at timestamptz
);
create index payment_slip_attempts_cleanup_idx on public.payment_slip_upload_attempts (created_at)
  where cleanup_required;

alter table public.payment_intents enable row level security;
alter table public.payments enable row level security;
alter table public.payment_slips enable row level security;
alter table public.payment_slip_upload_attempts enable row level security;

create policy payment_intents_select_own on public.payment_intents for select to authenticated
using ((select private.is_admin()) or user_id = (select auth.uid()));
create policy payments_select_own on public.payments for select to authenticated
using ((select private.is_admin()) or user_id = (select auth.uid()));
create policy payment_slips_select_own on public.payment_slips for select to authenticated
using ((select private.is_admin()) or user_id = (select auth.uid()));

revoke all on public.payment_intents, public.payments, public.payment_slips, public.payment_slip_upload_attempts from public, anon, authenticated, service_role;
grant select (id, quote_id, request_id, user_id, kind, amount_satang, status, created_at, verified_at)
  on public.payment_intents to authenticated;
grant select (id, intent_id, quote_id, request_id, user_id, kind, amount_satang, verified_at, created_at)
  on public.payments to authenticated;
grant select (id, intent_id, user_id, status, uploaded_at, delete_after, reviewed_at, rejection_reason, created_at)
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
  p_quote_id uuid, p_request_id uuid, p_amount_satang bigint, p_idempotency_key uuid
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
  select * into v_request from public.commission_requests
    where id = p_request_id and user_id = auth.uid() for update;
  if not found then raise exception 'request_not_found'; end if;

  select * into v_existing from public.payment_intents intent
    where intent.user_id = auth.uid() and intent.idempotency_key = p_idempotency_key;
  if found then
    if v_existing.payload_fingerprint <> v_fingerprint then raise exception 'idempotency_payload_mismatch'; end if;
    if v_existing.status <> 'pending' then
      return query select v_existing.id, v_existing.amount_satang, v_existing.kind, v_existing.status;
      return;
    end if;
  end if;

  update public.payment_intents intent set status = 'closed'
    where intent.request_id = p_request_id and intent.status = 'pending'
      and exists (
        select 1 from public.quotes old_quote
        where old_quote.id = intent.quote_id and (
          old_quote.status <> 'sent'
          or (old_quote.expires_at is not null and old_quote.expires_at <= now())
          or exists (select 1 from public.quotes newer where newer.request_id = old_quote.request_id and newer.version > old_quote.version)
        )
      );

  select * into v_quote from public.quotes quote
    where quote.id = p_quote_id and quote.request_id = p_request_id
      and quote.status = 'sent'
      and (quote.expires_at is null or quote.expires_at > now())
      and not exists (
        select 1 from public.quotes newer
        where newer.request_id = quote.request_id and newer.version > quote.version
      )
    for update;
  if not found then
    return;
  end if;

  if v_existing.id is not null then
    return query select v_existing.id, v_existing.amount_satang, v_existing.kind, v_existing.status;
    return;
  end if;

  select coalesce(sum(payment.amount_satang), 0)::bigint into v_paid
    from public.payments payment where payment.quote_id = p_quote_id;
  v_balance := v_quote.total_satang - v_paid;
  if p_amount_satang is null or p_amount_satang <= 0 then raise exception 'invalid_satang'; end if;
  if p_amount_satang > v_balance then raise exception 'payment_exceeds_balance'; end if;
  if v_paid = 0 then
    if exists (select 1 from public.payments payment where payment.request_id = p_request_id and payment.kind = 'deposit') then
      raise exception 'deposit_already_verified_for_request';
    end if;
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

  select * into v_existing from public.payment_intents intent
    where intent.quote_id = p_quote_id and intent.status = 'pending';
  if found then
    raise exception 'payment_intent_pending';
  end if;

  insert into public.payment_intents (quote_id, request_id, user_id, kind, amount_satang, idempotency_key, payload_fingerprint)
  values (p_quote_id, p_request_id, auth.uid(), v_kind, p_amount_satang, p_idempotency_key, v_fingerprint)
  returning id, public.payment_intents.amount_satang, public.payment_intents.kind, public.payment_intents.status
  into intent_id, amount_satang, kind, status;
  return next;
end;
$$;

create function private.get_member_pending_payment_intent(p_quote_id uuid, p_request_id uuid)
returns table(intent_id uuid, quote_id uuid, amount_satang bigint, kind text, status text, slip_status text)
language sql stable security definer set search_path = '' as $$
  select intent.id, intent.quote_id, intent.amount_satang, intent.kind, intent.status, latest_slip.status
  from public.payment_intents intent
  join public.commission_requests request on request.id = intent.request_id
  join public.quotes quote on quote.id = intent.quote_id and quote.request_id = request.id
  left join lateral (
    select case
      when slip.status = 'authorized' and slip.lease_expires_at <= now() then 'failed'::text
      else slip.status
    end as status
    from public.payment_slips slip
    where slip.intent_id = intent.id
    order by slip.created_at desc, slip.id desc limit 1
  ) latest_slip on true
  where intent.quote_id = p_quote_id and intent.request_id = p_request_id
    and intent.user_id = auth.uid() and request.user_id = auth.uid()
    and intent.status = 'pending' and quote.status = 'sent'
    and (quote.expires_at is null or quote.expires_at > now())
    and not exists (
      select 1 from public.quotes newer
      where newer.request_id = quote.request_id and newer.version > quote.version
    )
  order by intent.created_at desc
  limit 1;
$$;

create function private.authorize_payment_slip(
  p_user_id uuid, p_intent_id uuid, p_content_type text, p_size_bytes bigint, p_upload_key uuid, p_attempt_id uuid
) returns table(slip_id uuid, object_key text, content_type text, size_bytes bigint, slip_status text, delete_after timestamptz, cleanup_attempt_id uuid, cleanup_object_key text)
language plpgsql security definer set search_path = '' as $$
declare
  v_intent public.payment_intents%rowtype;
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
  if p_content_type not in ('image/png', 'image/jpeg', 'image/webp') or p_size_bytes not between 1 and 5242880 then
    raise exception 'invalid_slip_metadata';
  end if;
  v_extension := case p_content_type when 'image/jpeg' then 'jpg' when 'image/png' then 'png' else 'webp' end;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  with expired as (
    update public.payment_slips set status = 'failed', cleanup_required = true
      where user_id = p_user_id and status = 'authorized' and lease_expires_at <= now()
      returning attempt_id
  )
  update public.payment_slip_upload_attempts attempt set status = 'superseded', cleanup_required = true
    where attempt.attempt_id in (select expired.attempt_id from expired);
  select * into v_slip from public.payment_slips slip
    where slip.user_id = p_user_id and slip.upload_key = p_upload_key for update;
  v_slip_found := found;
  select * into v_intent from public.payment_intents
    where id = p_intent_id and user_id = p_user_id and status = 'pending' for update;
  if not found then raise exception 'payment_intent_not_found'; end if;
  select * into v_quote from public.quotes quote
    where quote.id = v_intent.quote_id and quote.status = 'sent'
      and (quote.expires_at is null or quote.expires_at > now())
      and not exists (select 1 from public.quotes newer where newer.request_id = quote.request_id and newer.version > quote.version)
    for update;
  if not found then
    update public.payment_intents set status = 'closed' where id = v_intent.id;
    return;
  end if;

  if v_slip_found then
    if v_slip.intent_id <> p_intent_id or v_slip.content_type <> p_content_type or v_slip.size_bytes <> p_size_bytes then
      raise exception 'idempotency_payload_mismatch';
    end if;
    if v_slip.status = 'pending_review' then
      return query select v_slip.id, v_slip.object_key, v_slip.content_type, v_slip.size_bytes, v_slip.status, v_slip.delete_after, null::uuid, null::text;
      return;
    end if;
    if v_slip.status = 'authorized' and v_slip.attempt_id <> p_attempt_id and v_slip.lease_expires_at > now() then
      raise exception 'payment_slip_upload_in_progress';
    end if;
    if v_slip.status not in ('authorized', 'failed') then raise exception 'payment_slip_not_uploadable'; end if;
    if v_slip.status = 'failed' or v_slip.lease_expires_at <= now() then
      if exists (
        select 1 from public.payment_slips other_slip
        where other_slip.intent_id = p_intent_id and other_slip.id <> v_slip.id
          and other_slip.status in ('authorized', 'pending_review')
      ) then raise exception 'payment_slip_active'; end if;
      v_cleanup_attempt_id := v_slip.attempt_id;
      v_cleanup_object_key := v_slip.object_key;
      update public.payment_slip_upload_attempts set status = 'superseded', cleanup_required = true
        where attempt_id = v_cleanup_attempt_id;
      if (select count(*) from public.payment_slip_upload_attempts attempt
          where attempt.user_id = p_user_id and attempt.created_at > now() - interval '1 hour') >= 5 then
        raise exception 'slip_upload_rate_limited';
      end if;
      v_object_key := 'payment-slips/' || gen_random_uuid()::text || '.' || v_extension;
      update public.payment_slips set status = 'authorized',
        object_key = v_object_key,
        attempt_id = p_attempt_id, lease_expires_at = now() + interval '10 minutes',
        etag = null, cleanup_required = false, uploaded_at = now(), delete_after = now() + interval '30 days'
        where id = v_slip.id returning * into v_slip;
      insert into public.payment_slip_upload_attempts (attempt_id, slip_id, user_id, object_key, status)
        values (p_attempt_id, v_slip.id, p_user_id, v_object_key, 'authorized');
    end if;
    return query select v_slip.id, v_slip.object_key, v_slip.content_type, v_slip.size_bytes, v_slip.status, v_slip.delete_after, v_cleanup_attempt_id, v_cleanup_object_key;
    return;
  end if;

  if exists (select 1 from public.payment_slips slip where slip.intent_id = p_intent_id and slip.status in ('authorized', 'pending_review')) then
    raise exception 'payment_slip_active';
  end if;
  if (select count(*) from public.payment_slip_upload_attempts attempt
      where attempt.user_id = p_user_id and attempt.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'slip_upload_rate_limited';
  end if;
  v_object_key := 'payment-slips/' || gen_random_uuid()::text || '.' || v_extension;
  insert into public.payment_slips (id, intent_id, user_id, object_key, content_type, size_bytes, upload_key, attempt_id, lease_expires_at)
  values (v_slip_id, p_intent_id, p_user_id, v_object_key, p_content_type, p_size_bytes, p_upload_key, p_attempt_id, now() + interval '10 minutes')
  returning * into v_slip;
  insert into public.payment_slip_upload_attempts (attempt_id, slip_id, user_id, object_key, status)
    values (p_attempt_id, v_slip.id, p_user_id, v_object_key, 'authorized');
  return query select v_slip.id, v_slip.object_key, v_slip.content_type, v_slip.size_bytes, v_slip.status, v_slip.delete_after, null::uuid, null::text;
end;
$$;

create function private.begin_payment_slip_put(p_user_id uuid, p_slip_id uuid, p_upload_key uuid, p_attempt_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_slip public.payment_slips%rowtype;
begin
  if p_user_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select * into v_slip from public.payment_slips
    where id = p_slip_id and user_id = p_user_id and upload_key = p_upload_key for update;
  if not found or v_slip.attempt_id <> p_attempt_id or v_slip.status <> 'authorized' or v_slip.lease_expires_at <= now() then
    raise exception 'payment_slip_attempt_lost';
  end if;
  update public.payment_slips set lease_expires_at = now() + interval '10 minutes' where id = v_slip.id;
end;
$$;

create function private.finalize_payment_slip(
  p_user_id uuid, p_slip_id uuid, p_attempt_id uuid, p_etag text, p_content_type text, p_size_bytes bigint, p_upload_key uuid
) returns table(slip_id uuid, slip_status text)
language plpgsql security definer set search_path = '' as $$
declare v_slip public.payment_slips%rowtype; v_etag text := nullif(btrim(p_etag), '');
begin
  if p_user_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if v_etag is null then raise exception 'etag_required_for_review'; end if;
  select * into v_slip from public.payment_slips where id = p_slip_id and user_id = p_user_id for update;
  if not found then raise exception 'payment_slip_not_found'; end if;
  if v_slip.attempt_id <> p_attempt_id then raise exception 'payment_slip_attempt_lost'; end if;
  if v_slip.upload_key <> p_upload_key or v_slip.content_type <> p_content_type or v_slip.size_bytes <> p_size_bytes then
    raise exception 'idempotency_payload_mismatch';
  end if;
  if v_slip.status = 'pending_review' then
    if v_slip.etag <> v_etag then raise exception 'idempotency_payload_mismatch'; end if;
    return query select v_slip.id, v_slip.status; return;
  end if;
  if v_slip.lease_expires_at <= now() then raise exception 'payment_slip_attempt_lost'; end if;
  if v_slip.status <> 'authorized' then raise exception 'payment_slip_not_found'; end if;
  update public.payment_slips set status = 'pending_review', etag = v_etag, cleanup_required = false,
    uploaded_at = now(), delete_after = now() + interval '30 days'
    where id = v_slip.id returning id, public.payment_slips.status into slip_id, slip_status;
  update public.payment_slip_upload_attempts as attempt
  set status = 'pending_review', cleanup_required = false, finalized_at = now()
  where attempt.attempt_id = p_attempt_id and attempt.slip_id = v_slip.id;
  return next;
end;
$$;

create function private.fail_payment_slip(p_user_id uuid, p_slip_id uuid, p_upload_key uuid, p_attempt_id uuid, p_cleanup_required boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  update public.payment_slips set status = 'failed', etag = null, cleanup_required = p_cleanup_required
    where id = p_slip_id and user_id = p_user_id and upload_key = p_upload_key and attempt_id = p_attempt_id
      and status in ('authorized', 'failed');
  update public.payment_slip_upload_attempts as attempt set
      status = case when status in ('superseded', 'deleted') then 'superseded' else 'failed' end,
      cleanup_required = p_cleanup_required
    where attempt.attempt_id = p_attempt_id and attempt.slip_id = p_slip_id and attempt.user_id = p_user_id
      and attempt.status in ('authorized', 'failed', 'superseded', 'deleted');
end;
$$;

create function private.admin_list_pending_payment_slips(p_limit integer default 25, p_before_uploaded_at timestamptz default null, p_before_id uuid default null)
returns table(slip_id uuid, object_key text, content_type text, size_bytes bigint, etag text, uploaded_at timestamptz, amount_satang bigint, kind text, request_id uuid)
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  return query select slip.id, slip.object_key, slip.content_type, slip.size_bytes, slip.etag, slip.uploaded_at,
    intent.amount_satang, intent.kind, intent.request_id
  from public.payment_slips slip join public.payment_intents intent on intent.id = slip.intent_id
  where slip.status = 'pending_review' and (
    p_before_uploaded_at is null or (slip.uploaded_at, slip.id) < (p_before_uploaded_at, p_before_id)
  )
  order by slip.uploaded_at desc, slip.id desc limit least(greatest(p_limit, 1), 50);
end;
$$;

create function private.admin_get_payment_slip_for_review(p_slip_id uuid)
returns table(slip_id uuid, object_key text, content_type text, size_bytes bigint, etag text)
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  return query select slip.id, slip.object_key, slip.content_type, slip.size_bytes, slip.etag
    from public.payment_slips slip where slip.id = p_slip_id and slip.status = 'pending_review';
end;
$$;

create function private.get_payment_verification_result(
  p_admin_user_id uuid, p_payment_id uuid, p_decision text, p_reason text, p_verification_key uuid
) returns table(payment_id uuid, intent_id uuid, slip_status text)
language plpgsql security definer set search_path = '' as $$
declare
  v_slip public.payment_slips%rowtype;
  v_payment public.payments%rowtype;
  v_fingerprint text := concat_ws(':', p_decision, coalesce(nullif(btrim(p_reason), ''), ''));
begin
  if not exists (
    select 1 from auth.users admin_user where admin_user.id = p_admin_user_id
      and lower(admin_user.email) = 'nasora.nsr300@gmail.com'
      and admin_user.raw_app_meta_data ->> 'role' = 'admin'
  ) then raise exception 'admin_required' using errcode = '42501'; end if;
  select * into v_slip from public.payment_slips where id = p_payment_id;
  if not found or v_slip.verification_key is null then return; end if;
  if v_slip.verification_key <> p_verification_key then raise exception 'idempotency_key_mismatch'; end if;
  if v_slip.verification_key = p_verification_key then
    if v_slip.verification_payload_fingerprint <> v_fingerprint then raise exception 'idempotency_payload_mismatch'; end if;
    if v_slip.status not in ('approved', 'rejected', 'stale') then return; end if;
    select * into v_payment from public.payments payment where payment.intent_id = v_slip.intent_id;
    return query select v_payment.id, v_slip.intent_id, v_slip.status;
  end if;
end;
$$;

create function private.verify_payment_slip(
  p_admin_user_id uuid, p_payment_id uuid, p_decision text, p_reason text, p_verification_key uuid
) returns table(payment_id uuid, intent_id uuid, slip_status text)
language plpgsql security definer set search_path = '' as $$
declare
  v_slip public.payment_slips%rowtype;
  v_intent public.payment_intents%rowtype;
  v_payment public.payments%rowtype;
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
    return query select v_payment.id, v_slip.intent_id, v_slip.status; return;
  end if;
  if v_slip.status <> 'pending_review' or nullif(btrim(v_slip.etag), '') is null then raise exception 'payment_slip_not_reviewable'; end if;
  select * into v_intent from public.payment_intents where id = v_slip.intent_id and status = 'pending' for update;
  if not found then raise exception 'payment_intent_not_found'; end if;
  select * into v_quote from public.quotes quote
    where quote.id = v_intent.quote_id and quote.status = 'sent'
      and (quote.expires_at is null or quote.expires_at > now())
      and not exists (select 1 from public.quotes newer where newer.request_id = quote.request_id and newer.version > quote.version)
    for update;
  if not found then
    update public.payment_slips set status = 'stale', reviewed_by = p_admin_user_id, reviewed_at = now(), rejection_reason = 'quote_not_payable',
      verification_key = p_verification_key, verification_payload_fingerprint = v_fingerprint where id = v_slip.id;
    update public.payment_intents set status = 'closed' where id = v_intent.id;
    return query select null::uuid, v_intent.id, 'stale'::text; return;
  end if;

  if p_decision = 'reject' then
    update public.payment_slips set status = 'rejected', reviewed_by = p_admin_user_id, reviewed_at = now(), rejection_reason = btrim(p_reason),
      verification_key = p_verification_key, verification_payload_fingerprint = v_fingerprint where id = v_slip.id;
    update public.payment_intents set status = 'pending' where id = v_intent.id;
    return query select null::uuid, v_intent.id, 'rejected'::text; return;
  end if;

  select coalesce(sum(payment.amount_satang), 0)::bigint into v_paid
    from public.payments payment where payment.quote_id = v_intent.quote_id;
  if v_intent.amount_satang > v_quote.total_satang - v_paid then raise exception 'payment_exceeds_balance'; end if;
  if v_intent.kind = 'deposit' and exists (
    select 1 from public.payments payment where payment.request_id = v_intent.request_id and payment.kind = 'deposit'
  ) then raise exception 'deposit_already_verified_for_request'; end if;

  insert into public.payments (intent_id, quote_id, request_id, user_id, kind, amount_satang, verified_by, verified_at)
  values (v_intent.id, v_intent.quote_id, v_intent.request_id, v_intent.user_id, v_intent.kind, v_intent.amount_satang, p_admin_user_id, now())
  on conflict on constraint payments_intent_id_key do nothing returning * into v_payment;
  if v_payment.id is null then select * into v_payment from public.payments payment where payment.intent_id = v_intent.id; end if;
  update public.payment_slips set status = 'approved', reviewed_by = p_admin_user_id, reviewed_at = v_payment.verified_at,
    rejection_reason = null, verification_key = p_verification_key, verification_payload_fingerprint = v_fingerprint where id = v_slip.id;
  update public.payment_intents set status = 'verified', verified_at = v_payment.verified_at where id = v_intent.id;
  return query select v_payment.id, v_intent.id, 'approved'::text;
end;
$$;

-- These exposed wrappers repeat authorization and are the only callable entry points.
create function public.member_create_payment_intent(p_quote_id uuid, p_request_id uuid, p_amount_satang bigint, p_idempotency_key uuid)
returns table(intent_id uuid, amount_satang bigint, kind text, status text)
language plpgsql security definer set search_path = '' as $$
begin if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
return query select * from private.create_payment_intent(p_quote_id, p_request_id, p_amount_satang, p_idempotency_key); end; $$;
create function public.member_get_pending_payment_intent(p_quote_id uuid, p_request_id uuid)
returns table(intent_id uuid, quote_id uuid, amount_satang bigint, kind text, status text, slip_status text)
language plpgsql security definer set search_path = '' as $$
begin if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
return query select * from private.get_member_pending_payment_intent(p_quote_id, p_request_id); end; $$;
create function public.gateway_authorize_payment_slip(p_user_id uuid, p_intent_id uuid, p_content_type text, p_size_bytes bigint, p_upload_key uuid, p_attempt_id uuid)
returns table(slip_id uuid, object_key text, content_type text, size_bytes bigint, slip_status text, delete_after timestamptz, cleanup_attempt_id uuid, cleanup_object_key text)
language plpgsql security definer set search_path = '' as $$
begin if coalesce((select auth.jwt()) ->> 'role', '') <> 'service_role' then raise exception 'service_role_required' using errcode = '42501'; end if;
return query select * from private.authorize_payment_slip(p_user_id, p_intent_id, p_content_type, p_size_bytes, p_upload_key, p_attempt_id); end; $$;
create function public.gateway_begin_payment_slip_put(p_user_id uuid, p_slip_id uuid, p_upload_key uuid, p_attempt_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin if coalesce((select auth.jwt()) ->> 'role', '') <> 'service_role' then raise exception 'service_role_required' using errcode = '42501'; end if;
perform private.begin_payment_slip_put(p_user_id, p_slip_id, p_upload_key, p_attempt_id); end; $$;
create function public.gateway_finalize_payment_slip(p_user_id uuid, p_slip_id uuid, p_attempt_id uuid, p_etag text, p_content_type text, p_size_bytes bigint, p_upload_key uuid)
returns table(slip_id uuid, slip_status text)
language plpgsql security definer set search_path = '' as $$
begin if coalesce((select auth.jwt()) ->> 'role', '') <> 'service_role' then raise exception 'service_role_required' using errcode = '42501'; end if;
return query select * from private.finalize_payment_slip(p_user_id, p_slip_id, p_attempt_id, p_etag, p_content_type, p_size_bytes, p_upload_key); end; $$;
create function public.gateway_fail_payment_slip(p_user_id uuid, p_slip_id uuid, p_upload_key uuid, p_attempt_id uuid, p_cleanup_required boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin if coalesce((select auth.jwt()) ->> 'role', '') <> 'service_role' then raise exception 'service_role_required' using errcode = '42501'; end if;
perform private.fail_payment_slip(p_user_id, p_slip_id, p_upload_key, p_attempt_id, p_cleanup_required); end; $$;
create function public.admin_list_pending_payment_slips(p_limit integer default 25, p_before_uploaded_at timestamptz default null, p_before_id uuid default null)
returns table(slip_id uuid, object_key text, content_type text, size_bytes bigint, etag text, uploaded_at timestamptz, amount_satang bigint, kind text, request_id uuid)
language plpgsql security definer set search_path = '' as $$
begin if not private.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
return query select * from private.admin_list_pending_payment_slips(p_limit, p_before_uploaded_at, p_before_id); end; $$;
create function public.admin_get_payment_slip_for_review(p_slip_id uuid)
returns table(slip_id uuid, object_key text, content_type text, size_bytes bigint, etag text)
language plpgsql security definer set search_path = '' as $$
begin if not private.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
return query select * from private.admin_get_payment_slip_for_review(p_slip_id); end; $$;
create function public.gateway_get_payment_verification_result(p_admin_user_id uuid, p_payment_id uuid, p_decision text, p_reason text, p_verification_key uuid)
returns table(payment_id uuid, intent_id uuid, slip_status text)
language plpgsql security definer set search_path = '' as $$
begin if coalesce((select auth.jwt()) ->> 'role', '') <> 'service_role' then raise exception 'service_role_required' using errcode = '42501'; end if;
return query select * from private.get_payment_verification_result(p_admin_user_id, p_payment_id, p_decision, p_reason, p_verification_key); end; $$;
create function public.gateway_verify_payment_slip(p_admin_user_id uuid, p_payment_id uuid, p_decision text, p_reason text, p_verification_key uuid)
returns table(payment_id uuid, intent_id uuid, slip_status text)
language plpgsql security definer set search_path = '' as $$
begin if coalesce((select auth.jwt()) ->> 'role', '') <> 'service_role' then raise exception 'service_role_required' using errcode = '42501'; end if;
return query select * from private.verify_payment_slip(p_admin_user_id, p_payment_id, p_decision, p_reason, p_verification_key); end; $$;

revoke all on function private.payments_prevent_mutation(), private.create_payment_intent(uuid, uuid, bigint, uuid),
  private.get_member_pending_payment_intent(uuid, uuid),
  private.authorize_payment_slip(uuid, uuid, text, bigint, uuid, uuid), private.begin_payment_slip_put(uuid, uuid, uuid, uuid),
  private.finalize_payment_slip(uuid, uuid, uuid, text, text, bigint, uuid),
  private.fail_payment_slip(uuid, uuid, uuid, uuid, boolean),
  private.admin_list_pending_payment_slips(integer, timestamptz, uuid),
  private.admin_get_payment_slip_for_review(uuid), private.get_payment_verification_result(uuid, uuid, text, text, uuid),
  private.verify_payment_slip(uuid, uuid, text, text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.member_create_payment_intent(uuid, uuid, bigint, uuid), public.member_get_pending_payment_intent(uuid, uuid),
  public.gateway_authorize_payment_slip(uuid, uuid, text, bigint, uuid, uuid), public.gateway_finalize_payment_slip(uuid, uuid, uuid, text, text, bigint, uuid),
  public.gateway_begin_payment_slip_put(uuid, uuid, uuid, uuid),
  public.gateway_fail_payment_slip(uuid, uuid, uuid, uuid, boolean),
  public.admin_list_pending_payment_slips(integer, timestamptz, uuid),
  public.admin_get_payment_slip_for_review(uuid), public.gateway_get_payment_verification_result(uuid, uuid, text, text, uuid),
  public.gateway_verify_payment_slip(uuid, uuid, text, text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.member_create_payment_intent(uuid, uuid, bigint, uuid), public.member_get_pending_payment_intent(uuid, uuid),
  public.admin_list_pending_payment_slips(integer, timestamptz, uuid),
  public.admin_get_payment_slip_for_review(uuid)
  to authenticated;
grant execute on function public.gateway_authorize_payment_slip(uuid, uuid, text, bigint, uuid, uuid),
  public.gateway_begin_payment_slip_put(uuid, uuid, uuid, uuid),
  public.gateway_finalize_payment_slip(uuid, uuid, uuid, text, text, bigint, uuid),
  public.gateway_fail_payment_slip(uuid, uuid, uuid, uuid, boolean),
  public.gateway_get_payment_verification_result(uuid, uuid, text, text, uuid),
  public.gateway_verify_payment_slip(uuid, uuid, text, text, uuid) to service_role;

-- Runtime RLS role simulation and function execution are verified in deployed Supabase environments.

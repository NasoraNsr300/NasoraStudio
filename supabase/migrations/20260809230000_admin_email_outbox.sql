-- Admin-only email outbox. Payloads contain entity IDs only; customer contact never enters email jobs.

create table private.email_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('new_estimate', 'new_slip', 'new_member_message', 'delivery_expiry', 'scheduled_failure')),
  recipient text not null default 'nasora.nsr300@gmail.com' check (lower(recipient) = 'nasora.nsr300@gmail.com'),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  dedupe_key text not null unique check (char_length(dedupe_key) between 1 and 240),
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts between 0 and 5),
  next_retry_at timestamptz not null default now(),
  processing_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index email_outbox_pending_idx on private.email_outbox (next_retry_at, created_at)
where status in ('pending', 'failed', 'processing');

create function private.enqueue_admin_email(p_event_type text, p_payload jsonb, p_dedupe_key text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_event_type not in ('new_estimate', 'new_slip', 'new_member_message', 'delivery_expiry', 'scheduled_failure')
    or nullif(btrim(p_dedupe_key), '') is null then raise exception 'invalid_email_event'; end if;
  insert into private.email_outbox (event_type, recipient, payload, dedupe_key)
  values (p_event_type, 'nasora.nsr300@gmail.com', coalesce(p_payload, '{}'::jsonb), btrim(p_dedupe_key))
  on conflict (dedupe_key) do nothing;
end; $$;

create function private.enqueue_new_estimate_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.enqueue_admin_email('new_estimate', jsonb_build_object('request_id', new.id), 'new_estimate:' || new.id);
  return new;
end; $$;
create trigger commission_request_admin_email after insert on public.commission_requests
for each row execute function private.enqueue_new_estimate_email();

create function private.enqueue_new_slip_email() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_changed boolean := false;
begin
  if new.status = 'pending_review' then
    if tg_op = 'INSERT' then v_changed := true; elsif old.status is distinct from new.status then v_changed := true; end if;
  end if;
  if v_changed then
    perform private.enqueue_admin_email('new_slip', jsonb_build_object('slip_id', new.id, 'intent_id', new.intent_id), 'new_slip:' || new.id);
  end if;
  return new;
end; $$;
create trigger payment_slip_admin_email after insert or update of status on public.payment_slips
for each row execute function private.enqueue_new_slip_email();

create function private.enqueue_member_message_email() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_job_id uuid;
begin
  if new.sender_role = 'member' then
    select conversation.job_id into v_job_id from public.conversations conversation where conversation.id = new.conversation_id;
    perform private.enqueue_admin_email('new_member_message', jsonb_build_object('job_id', v_job_id, 'message_id', new.id), 'new_member_message:' || new.id);
  end if;
  return new;
end; $$;
create trigger member_message_admin_email after insert on public.messages
for each row execute function private.enqueue_member_message_email();

create function private.enqueue_cleanup_email() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_delivery_kind text; v_job_id uuid;
begin
  if new.status = 'failed' and new.attempts >= 5 and old.status is distinct from new.status then
    perform private.enqueue_admin_email('scheduled_failure', jsonb_build_object('cleanup_task_id', new.id, 'target_id', new.target_id), 'scheduled_failure:cleanup:' || new.id);
  elsif new.status = 'complete' and new.target_type = 'delivery' and old.status is distinct from new.status then
    select delivery.kind, delivery.job_id into v_delivery_kind, v_job_id from public.deliveries delivery where delivery.id = new.target_id;
    if v_delivery_kind = 'google_drive' then
      perform private.enqueue_admin_email('delivery_expiry', jsonb_build_object('delivery_id', new.target_id, 'job_id', v_job_id), 'delivery_expiry:' || new.target_id);
    end if;
  end if;
  return new;
end; $$;
create trigger cleanup_task_admin_email after update of status on private.cleanup_tasks
for each row execute function private.enqueue_cleanup_email();

create function public.claim_admin_email_batch(p_limit integer default 10)
returns table(id uuid, event_type text, recipient text, payload jsonb, attempts integer)
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with claimable as (
    select outbox.id
    from private.email_outbox outbox
    where outbox.attempts < 5 and outbox.next_retry_at <= now()
      and (outbox.status in ('pending', 'failed') or (outbox.status = 'processing' and outbox.processing_at < now() - interval '10 minutes'))
    order by outbox.created_at
    for update skip locked
    limit least(greatest(coalesce(p_limit, 10), 1), 20)
  ), claimed as (
    update private.email_outbox outbox
    set status = 'processing', attempts = outbox.attempts + 1, processing_at = now()
    from claimable where outbox.id = claimable.id
    returning outbox.id, outbox.event_type, outbox.recipient, outbox.payload, outbox.attempts
  ) select * from claimed;
end; $$;

create function public.complete_admin_email(p_id uuid, p_sent boolean, p_error text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update private.email_outbox
  set status = case when p_sent then 'sent' else 'failed' end,
      sent_at = case when p_sent then now() else null end,
      processing_at = null,
      last_error = case when p_sent then null else left(coalesce(p_error, 'email_failed'), 500) end,
      next_retry_at = case when p_sent then next_retry_at else now() + make_interval(mins => least(60, attempts * 5)) end
  where id = p_id and status = 'processing';
end; $$;

revoke all on private.email_outbox from public, anon, authenticated, service_role;
revoke all on function private.enqueue_admin_email(text, jsonb, text), private.enqueue_new_estimate_email(), private.enqueue_new_slip_email(), private.enqueue_member_message_email(), private.enqueue_cleanup_email() from public, anon, authenticated, service_role;
revoke all on function public.claim_admin_email_batch(integer), public.complete_admin_email(uuid, boolean, text) from public, anon, authenticated, service_role;
grant execute on function public.claim_admin_email_batch(integer), public.complete_admin_email(uuid, boolean, text) to service_role;

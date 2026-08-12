-- Reset one ordinary member account for repeatable end-to-end checks.
-- This is deliberately unavailable to browser roles and never deletes auth.users.

create or replace function private.payments_prevent_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
    and coalesce((select auth.jwt()) ->> 'role', '') = 'service_role'
    and current_setting('nasora.test_reset_user_id', true) = old.user_id::text
    and exists (
      select 1
      from auth.users account
      where account.id = old.user_id
        and lower(account.email) = 'customer.test@nasora.local'
        and account.raw_app_meta_data ->> 'role' = 'member'
    )
  then
    return old;
  end if;

  raise exception 'verified_payments_are_append_only';
end;
$$;

create or replace function private.enforce_quote_item_immutability()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_quote_id uuid;
  v_status text;
  v_owner_id uuid;
begin
  v_quote_id := case when tg_op = 'DELETE' then old.quote_id else new.quote_id end;

  select quote.status, request.user_id
  into v_status, v_owner_id
  from public.quotes quote
  join public.commission_requests request on request.id = quote.request_id
  where quote.id = v_quote_id;

  if tg_op = 'DELETE'
    and coalesce((select auth.jwt()) ->> 'role', '') = 'service_role'
    and current_setting('nasora.test_reset_user_id', true) = v_owner_id::text
    and exists (
      select 1
      from auth.users account
      where account.id = v_owner_id
        and lower(account.email) = 'customer.test@nasora.local'
        and account.raw_app_meta_data ->> 'role' = 'member'
    )
  then
    return old;
  end if;

  if v_status is distinct from 'draft' then
    raise exception 'quote_snapshot_is_immutable';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create function public.gateway_reset_test_customer(
  p_user_id uuid,
  p_email text,
  p_nickname text,
  p_contact_value text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account auth.users%rowtype;
  v_request_ids uuid[] := array[]::uuid[];
  v_quote_ids uuid[] := array[]::uuid[];
  v_job_ids uuid[] := array[]::uuid[];
  v_intent_ids uuid[] := array[]::uuid[];
  v_slip_ids uuid[] := array[]::uuid[];
  v_conversation_ids uuid[] := array[]::uuid[];
  v_message_ids uuid[] := array[]::uuid[];
  v_asset_ids uuid[] := array[]::uuid[];
  v_progress_ids uuid[] := array[]::uuid[];
  v_delivery_ids uuid[] := array[]::uuid[];
begin
  if coalesce((select auth.jwt()) ->> 'role', '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  if lower(btrim(coalesce(p_email, ''))) <> 'customer.test@nasora.local' then
    raise exception 'test_customer_email_not_allowed' using errcode = '42501';
  end if;

  if nullif(btrim(p_nickname), '') is null
    or char_length(btrim(p_nickname)) > 60
    or nullif(btrim(p_contact_value), '') is null
    or char_length(btrim(p_contact_value)) > 200
  then
    raise exception 'invalid_test_customer_profile';
  end if;

  select * into v_account
  from auth.users account
  where account.id = p_user_id
    and lower(account.email) = 'customer.test@nasora.local'
  for update;

  if not found then
    raise exception 'test_customer_not_found';
  end if;

  if coalesce(v_account.raw_app_meta_data ->> 'role', 'member') = 'admin' then
    raise exception 'admin_identity_cannot_be_reset' using errcode = '42501';
  end if;

  if v_account.raw_app_meta_data ->> 'role' <> 'member' then
    raise exception 'ordinary_member_role_required' using errcode = '42501';
  end if;

  perform set_config('nasora.test_reset_user_id', p_user_id::text, true);

  select coalesce(array_agg(request.id), array[]::uuid[])
  into v_request_ids
  from public.commission_requests request
  where request.user_id = p_user_id;

  select coalesce(array_agg(quote.id), array[]::uuid[])
  into v_quote_ids
  from public.quotes quote
  where quote.request_id = any(v_request_ids);

  select coalesce(array_agg(job.id), array[]::uuid[])
  into v_job_ids
  from public.jobs job
  where job.user_id = p_user_id
     or job.request_id = any(v_request_ids);

  select coalesce(array_agg(intent.id), array[]::uuid[])
  into v_intent_ids
  from public.payment_intents intent
  where intent.user_id = p_user_id
     or intent.request_id = any(v_request_ids);

  select coalesce(array_agg(slip.id), array[]::uuid[])
  into v_slip_ids
  from public.payment_slips slip
  where slip.user_id = p_user_id
     or slip.intent_id = any(v_intent_ids);

  select coalesce(array_agg(conversation.id), array[]::uuid[])
  into v_conversation_ids
  from public.conversations conversation
  where conversation.member_user_id = p_user_id
     or conversation.job_id = any(v_job_ids);

  select coalesce(array_agg(message.id), array[]::uuid[])
  into v_message_ids
  from public.messages message
  where message.conversation_id = any(v_conversation_ids);

  select coalesce(array_agg(asset.id), array[]::uuid[])
  into v_asset_ids
  from public.message_assets asset
  where asset.message_id = any(v_message_ids);

  select coalesce(array_agg(progress.id), array[]::uuid[])
  into v_progress_ids
  from public.job_progress_updates progress
  where progress.job_id = any(v_job_ids);

  select coalesce(array_agg(delivery.id), array[]::uuid[])
  into v_delivery_ids
  from public.deliveries delivery
  where delivery.job_id = any(v_job_ids);

  delete from private.cleanup_tasks task
  where (task.target_type = 'delivery' and task.target_id = any(v_delivery_ids))
     or (task.target_type = 'message_asset' and task.target_id = any(v_asset_ids))
     or (task.target_type = 'progress_image' and task.target_id = any(v_progress_ids));

  delete from private.email_outbox email
  where exists (
    select 1 from unnest(v_request_ids) request_id
    where email.payload ->> 'request_id' = request_id::text
  ) or exists (
    select 1 from unnest(v_slip_ids) slip_id
    where email.payload ->> 'slip_id' = slip_id::text
  ) or exists (
    select 1 from unnest(v_message_ids) message_id
    where email.payload ->> 'message_id' = message_id::text
  ) or exists (
    select 1 from unnest(v_delivery_ids) delivery_id
    where email.payload ->> 'delivery_id' = delivery_id::text
  );

  delete from public.notifications
  where recipient_user_id = p_user_id;

  delete from public.conversation_reads read_state
  where read_state.user_id = p_user_id
     or read_state.conversation_id = any(v_conversation_ids);
  delete from public.message_assets asset where asset.id = any(v_asset_ids);
  delete from public.messages message where message.id = any(v_message_ids);
  delete from public.conversations conversation where conversation.id = any(v_conversation_ids);

  delete from public.deliveries delivery where delivery.id = any(v_delivery_ids);
  delete from public.job_progress_updates progress where progress.id = any(v_progress_ids);
  delete from public.queue_entries queue where queue.job_id = any(v_job_ids);
  delete from public.job_status_history history where history.job_id = any(v_job_ids);
  delete from public.job_charge_adjustments adjustment where adjustment.job_id = any(v_job_ids);

  delete from public.payment_slip_upload_attempts attempt
  where attempt.user_id = p_user_id
     or attempt.slip_id = any(v_slip_ids);
  delete from public.payment_slips slip where slip.id = any(v_slip_ids);
  delete from public.payments payment where payment.user_id = p_user_id;
  delete from public.payment_intents intent where intent.id = any(v_intent_ids);

  delete from public.jobs job where job.id = any(v_job_ids);
  delete from public.quote_items item where item.quote_id = any(v_quote_ids);
  delete from public.quotes quote where quote.id = any(v_quote_ids);
  delete from public.request_answers answer where answer.request_id = any(v_request_ids);
  delete from public.commission_requests where user_id = p_user_id;

  delete from public.audit_logs audit
  where audit.actor_user_id = p_user_id
     or audit.entity_id = any(v_request_ids)
     or audit.entity_id = any(v_quote_ids)
     or audit.entity_id = any(v_job_ids)
     or audit.entity_id = any(v_intent_ids)
     or audit.entity_id = any(v_slip_ids);

  delete from public.contact_channels contact where contact.user_id = p_user_id;

  insert into public.profiles (user_id, nickname, preferred_locale)
  values (p_user_id, btrim(p_nickname), 'th')
  on conflict (user_id) do update
  set nickname = excluded.nickname,
      preferred_locale = excluded.preferred_locale,
      updated_at = now();

  insert into public.contact_channels (user_id, kind, value, is_default)
  values (p_user_id, 'email', btrim(p_contact_value), true);

  return jsonb_build_object(
    'user_id', p_user_id,
    'email', 'customer.test@nasora.local',
    'requests_deleted', cardinality(v_request_ids),
    'quotes_deleted', cardinality(v_quote_ids),
    'jobs_deleted', cardinality(v_job_ids),
    'payment_intents_deleted', cardinality(v_intent_ids),
    'payment_slips_deleted', cardinality(v_slip_ids),
    'orphaned_r2_objects_expire_by_lifecycle',
      cardinality(v_asset_ids) + cardinality(v_progress_ids) + cardinality(v_delivery_ids) + cardinality(v_slip_ids)
  );
end;
$$;

revoke all on function public.gateway_reset_test_customer(uuid, text, text, text)
from public, anon, authenticated, service_role;
grant execute on function public.gateway_reset_test_customer(uuid, text, text, text)
to service_role;

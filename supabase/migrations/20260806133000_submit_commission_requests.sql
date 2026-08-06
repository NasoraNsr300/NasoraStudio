alter table public.commission_requests
  add column request_code text default (
    'REQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  ),
  add column submission_key uuid default gen_random_uuid();

alter table public.commission_requests
  alter column request_code set not null,
  alter column submission_key set not null,
  add constraint commission_requests_request_code_format_check
    check (request_code ~ '^REQ-[A-F0-9]{10}$');

create unique index commission_requests_request_code_uidx
  on public.commission_requests (request_code);

create unique index commission_requests_submission_key_uidx
  on public.commission_requests (submission_key);

create function public.submit_commission_request(p_payload jsonb)
returns table(request_id uuid, request_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_requester_mode text;
  v_submission_key uuid;
  v_request_id uuid;
  v_request_code text;
  v_member_name text;
  v_member_contact jsonb;
  v_guest_name text;
  v_guest_contact jsonb;
  v_category_slug text;
  v_category_name jsonb;
  v_service_slug text;
  v_service_name jsonb;
  v_usage_type text;
  v_budget_min bigint;
  v_budget_max bigint;
  v_deadline date;
  v_description text;
  v_mood text;
  v_extra_characters integer;
  v_background_level integer;
  v_prop_count integer;
  v_unknown_key text;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid_request_payload';
  end if;

  select key into v_unknown_key
  from jsonb_object_keys(p_payload) as payload_key(key)
  where not (key = any (array[
    'accepted_legal', 'background_level', 'budget_max_satang',
    'budget_min_satang', 'category_name', 'category_slug', 'description',
    'extra_character_count', 'guest_contact', 'guest_display_name',
    'mood_and_style', 'prop_count', 'requested_deadline', 'requester_mode',
    'service_type_name', 'service_type_slug', 'submission_key', 'usage_type'
  ]::text[]))
  limit 1;

  if v_unknown_key is not null then
    raise exception 'unknown_request_field';
  end if;

  if p_payload -> 'accepted_legal' is distinct from 'true'::jsonb then
    raise exception 'legal_consent_required';
  end if;

  begin
    v_submission_key := (p_payload ->> 'submission_key')::uuid;
    v_budget_min := nullif(p_payload ->> 'budget_min_satang', '')::bigint;
    v_budget_max := nullif(p_payload ->> 'budget_max_satang', '')::bigint;
    v_deadline := (p_payload ->> 'requested_deadline')::date;
    v_extra_characters := (p_payload ->> 'extra_character_count')::integer;
    v_background_level := (p_payload ->> 'background_level')::integer;
    v_prop_count := (p_payload ->> 'prop_count')::integer;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'invalid_request_value';
  end;

  if v_submission_key is null then
    raise exception 'submission_key_required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_submission_key::text, 0));

  select request.id, request.request_code
  into v_request_id, v_request_code
  from public.commission_requests as request
  where request.submission_key = v_submission_key
    and (
      (v_user_id is null and request.requester_type = 'guest')
      or request.user_id = v_user_id
    );

  if v_request_id is not null then
    return query select v_request_id, v_request_code;
    return;
  end if;

  v_requester_mode := trim(p_payload ->> 'requester_mode');
  v_category_slug := trim(p_payload ->> 'category_slug');
  v_category_name := p_payload -> 'category_name';
  v_service_slug := trim(p_payload ->> 'service_type_slug');
  v_service_name := p_payload -> 'service_type_name';
  v_usage_type := trim(p_payload ->> 'usage_type');
  v_description := trim(p_payload ->> 'description');
  v_mood := trim(coalesce(p_payload ->> 'mood_and_style', ''));

  if v_requester_mode is null or v_requester_mode not in ('member', 'guest')
    or (v_user_id is null and v_requester_mode <> 'guest')
    or (v_user_id is not null and v_requester_mode <> 'member') then
    raise exception 'requester_mode_mismatch';
  end if;

  if v_category_slug is null or v_category_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or char_length(v_category_slug) > 120
    or v_service_slug is null or v_service_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or char_length(v_service_slug) > 120 then
    raise exception 'invalid_service_snapshot';
  end if;

  if jsonb_typeof(v_category_name) is distinct from 'object'
    or jsonb_typeof(v_service_name) is distinct from 'object'
    or nullif(trim(v_category_name ->> 'th'), '') is null
    or nullif(trim(v_category_name ->> 'en'), '') is null
    or nullif(trim(v_service_name ->> 'th'), '') is null
    or nullif(trim(v_service_name ->> 'en'), '') is null
    or char_length(v_category_name ->> 'th') > 160
    or char_length(v_category_name ->> 'en') > 160
    or char_length(v_service_name ->> 'th') > 160
    or char_length(v_service_name ->> 'en') > 160 then
    raise exception 'invalid_service_snapshot';
  end if;

  if v_usage_type is null or v_usage_type not in ('personal', 'commercial') then
    raise exception 'invalid_usage_type';
  end if;

  if (v_budget_min is not null and (v_budget_min < 0 or v_budget_min > 10000000000))
    or (v_budget_max is not null and (v_budget_max < 0 or v_budget_max > 10000000000))
    or (v_budget_min is not null and v_budget_max is not null and v_budget_min > v_budget_max) then
    raise exception 'invalid_budget_range';
  end if;

  if v_deadline is null or v_deadline < current_date then
    raise exception 'invalid_requested_deadline';
  end if;

  if v_description is null or char_length(v_description) not between 1 and 1000
    or char_length(v_mood) > 800 then
    raise exception 'invalid_request_description';
  end if;

  if v_extra_characters is null or v_extra_characters not between 0 and 20
    or v_background_level is null or v_background_level not between 0 and 20
    or v_prop_count is null or v_prop_count not between 0 and 20 then
    raise exception 'invalid_extra_count';
  end if;

  if v_user_id is not null then
    select
      coalesce(nullif(trim(profile.nickname), ''), nullif(trim(auth_user.raw_user_meta_data ->> 'nickname'), ''), split_part(auth_user.email, '@', 1), 'Member'),
      coalesce(
        (
          select jsonb_build_object('kind', channel.kind, 'value', channel.value)
          from public.contact_channels as channel
          where channel.user_id = v_user_id
          order by channel.is_default desc, channel.created_at asc
          limit 1
        ),
        jsonb_build_object('kind', 'email', 'value', auth_user.email)
      )
    into v_member_name, v_member_contact
    from auth.users as auth_user
    left join public.profiles as profile on profile.user_id = auth_user.id
    where auth_user.id = v_user_id;

    if v_member_name is null then
      raise exception 'member_profile_not_found';
    end if;
  else
    v_guest_name := trim(p_payload ->> 'guest_display_name');
    v_guest_contact := p_payload -> 'guest_contact';

    if v_guest_name is null or char_length(v_guest_name) not between 1 and 80
      or jsonb_typeof(v_guest_contact) is distinct from 'object'
      or coalesce(v_guest_contact ->> 'kind', '') not in ('discord', 'email', 'facebook', 'x')
      or nullif(trim(v_guest_contact ->> 'value'), '') is null
      or char_length(v_guest_contact ->> 'value') > 200 then
      raise exception 'invalid_guest_identity';
    end if;
  end if;

  insert into public.commission_requests (
    requester_type, user_id, member_display_name_snapshot,
    guest_display_name, guest_contact_snapshot, contact_snapshot,
    category_slug, category_name_snapshot, service_type_slug,
    service_type_name_snapshot, usage_type, budget_min_satang,
    budget_max_satang, requested_deadline, description, mood_and_style,
    extra_character_count, background_level, prop_count, submission_key
  ) values (
    v_requester_mode, v_user_id, v_member_name,
    v_guest_name, v_guest_contact, coalesce(v_member_contact, v_guest_contact),
    v_category_slug, v_category_name, v_service_slug,
    v_service_name, v_usage_type, v_budget_min,
    v_budget_max, v_deadline, v_description, nullif(v_mood, ''),
    v_extra_characters, v_background_level, v_prop_count, v_submission_key
  )
  returning id, commission_requests.request_code into v_request_id, v_request_code;

  insert into public.request_answers (
    request_id, field_key, field_label_snapshot, value, display_order
  ) values
    (
      v_request_id,
      'form_version',
      '{"th":"เวอร์ชันแบบประเมิน","en":"Form version"}'::jsonb,
      '1'::jsonb,
      0
    ),
    (
      v_request_id,
      'accepted_legal',
      '{"th":"ยอมรับนโยบายและข้อกำหนด","en":"Accepted policies and terms"}'::jsonb,
      jsonb_build_object('accepted', true, 'accepted_at', now()),
      1
    );

  return query select v_request_id, v_request_code;
end;
$$;

create function public.cancel_own_commission_request(p_request_id uuid)
returns table(request_id uuid, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_before jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  select to_jsonb(request.*) into v_before
  from public.commission_requests as request
  where request.id = p_request_id
    and request.user_id = auth.uid()
    and request.status in ('submitted', 'reviewing')
  for update;

  if v_before is null then
    raise exception 'request_not_cancellable';
  end if;

  update public.commission_requests
  set status = 'cancelled', closed_at = now(), updated_at = now()
  where id = p_request_id;

  insert into public.audit_logs (
    actor_user_id, actor_role, action, entity_type, entity_id,
    before_state, after_state, reason
  ) values (
    v_user_id, 'member', 'cancel_request', 'commission_request', p_request_id,
    v_before - 'guest_contact_snapshot' - 'contact_snapshot',
    jsonb_build_object('status', 'cancelled'),
    'Cancelled by request owner before work began'
  );

  return query select p_request_id, 'cancelled'::text;
end;
$$;

revoke all on function public.submit_commission_request(jsonb) from public;
revoke all on function public.cancel_own_commission_request(uuid) from public;

grant execute on function public.submit_commission_request(jsonb) to anon, authenticated;
grant execute on function public.cancel_own_commission_request(uuid) to authenticated;

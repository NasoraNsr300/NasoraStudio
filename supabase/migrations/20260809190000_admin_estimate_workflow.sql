alter table public.quotes
  add column submission_key uuid,
  add column submission_payload_fingerprint text,
  add column estimated_duration_min_days integer,
  add column estimated_duration_max_days integer,
  add constraint quote_duration_range_check check (
    (estimated_duration_min_days is null and estimated_duration_max_days is null)
    or (
      estimated_duration_min_days is not null
      and estimated_duration_max_days is not null
      and estimated_duration_min_days > 0
      and estimated_duration_max_days >= estimated_duration_min_days
    )
  ),
  add constraint quote_submission_fingerprint_check check (
    (submission_key is null and submission_payload_fingerprint is null)
    or (submission_key is not null and submission_payload_fingerprint is not null)
  ),
  add constraint quote_request_submission_unique unique (request_id, submission_key);

create function private.save_and_send_quote(
  p_request_id uuid,
  p_payload jsonb
) returns table(quote_id uuid, version integer, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.commission_requests%rowtype;
  v_quote public.quotes%rowtype;
  v_existing public.quotes%rowtype;
  v_item jsonb;
  v_submission_key uuid;
  v_payload_fingerprint text;
  v_scope jsonb;
  v_items jsonb;
  v_total_satang bigint;
  v_item_total numeric := 0;
  v_deposit_percent integer;
  v_free_revisions integer;
  v_duration_min integer;
  v_duration_max integer;
  v_proposed_deadline date;
  v_expires_at timestamptz;
  v_terms_slug text;
  v_terms_version integer;
  v_version integer;
  v_order integer := 0;
  v_quantity integer;
  v_unit_amount_satang bigint;
  v_line_total_satang bigint;
  v_quantity_text text;
  v_unit_amount_text text;
  v_line_total_text text;
  v_money_min constant numeric := -2147483647;
  v_money_max constant numeric := 2147483647;
begin
  if not private.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid_quote_payload';
  end if;

  if (p_payload ->> 'idempotencyKey') is null
    or (p_payload ->> 'idempotencyKey') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  then
    raise exception 'invalid_quote_payload';
  end if;

  v_submission_key := (p_payload ->> 'idempotencyKey')::uuid;
  v_payload_fingerprint := (p_payload - 'idempotencyKey')::text;

  select * into v_request
  from public.commission_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'request_not_found';
  end if;

  select * into v_existing
  from public.quotes
  where request_id = p_request_id
    and submission_key = v_submission_key;

  if found then
    if v_existing.submission_payload_fingerprint is distinct from v_payload_fingerprint then
      raise exception 'idempotency_payload_mismatch';
    end if;
    return query select v_existing.id, v_existing.version, v_existing.status;
    return;
  end if;

  if v_request.status not in ('reviewing', 'quoted') then
    raise exception 'invalid_request_transition';
  end if;

  v_scope := p_payload -> 'scope';
  v_items := p_payload -> 'items';

  if jsonb_typeof(v_scope) <> 'object'
    or nullif(btrim(v_scope ->> 'th'), '') is null
    or nullif(btrim(v_scope ->> 'en'), '') is null
    or jsonb_typeof(v_items) <> 'array'
    or jsonb_array_length(v_items) = 0
    or jsonb_typeof(p_payload -> 'totalSatang') <> 'string'
    or char_length(p_payload ->> 'totalSatang') > 10
    or (p_payload ->> 'totalSatang') !~ '^(0|[1-9][0-9]*)$'
    or char_length(p_payload ->> 'depositPercent') > 3
    or (p_payload ->> 'depositPercent') !~ '^(0|[1-9][0-9]*)$'
    or char_length(p_payload ->> 'freeRevisions') > 4
    or (p_payload ->> 'freeRevisions') !~ '^(0|[1-9][0-9]*)$'
    or char_length(p_payload ->> 'durationMinDays') > 4
    or (p_payload ->> 'durationMinDays') !~ '^(0|[1-9][0-9]*)$'
    or char_length(p_payload ->> 'durationMaxDays') > 4
    or (p_payload ->> 'durationMaxDays') !~ '^(0|[1-9][0-9]*)$'
    or char_length(p_payload #>> '{termsDocument,version}') > 10
    or (p_payload #>> '{termsDocument,version}') !~ '^(0|[1-9][0-9]*)$'
  then
    raise exception 'invalid_quote_payload';
  end if;

  if (p_payload ->> 'totalSatang')::numeric > v_money_max
    or (p_payload ->> 'depositPercent')::numeric > 100
    or (p_payload ->> 'freeRevisions')::numeric > 1000
    or (p_payload ->> 'durationMinDays')::numeric not between 1 and 3650
    or (p_payload ->> 'durationMaxDays')::numeric not between 1 and 3650
    or (p_payload #>> '{termsDocument,version}')::numeric not between 1 and 2147483647
  then
    raise exception 'invalid_quote_payload';
  end if;

  begin
    v_total_satang := (p_payload ->> 'totalSatang')::bigint;
    v_deposit_percent := (p_payload ->> 'depositPercent')::integer;
    v_free_revisions := (p_payload ->> 'freeRevisions')::integer;
    v_duration_min := (p_payload ->> 'durationMinDays')::integer;
    v_duration_max := (p_payload ->> 'durationMaxDays')::integer;
    v_proposed_deadline := nullif(p_payload ->> 'proposedDeadline', '')::date;
    v_expires_at := (p_payload ->> 'expiresAt')::timestamptz;
    v_terms_slug := nullif(btrim(p_payload #>> '{termsDocument,slug}'), '');
    v_terms_version := (p_payload #>> '{termsDocument,version}')::integer;
  exception when others then
    raise exception 'invalid_quote_payload';
  end;

  if v_duration_max < v_duration_min
    or v_expires_at is null or v_expires_at <= now()
    or v_terms_slug is null
  then
    raise exception 'invalid_quote_payload';
  end if;

  for v_item in select value from jsonb_array_elements(v_items)
  loop
    v_quantity_text := v_item ->> 'quantity';
    v_unit_amount_text := v_item ->> 'unitAmountSatang';
    v_line_total_text := v_item ->> 'lineTotalSatang';

    if (v_item ->> 'itemType') is null
      or (v_item ->> 'itemType') not in ('base', 'character', 'background', 'prop', 'rush', 'discount', 'other')
      or nullif(btrim(v_item #>> '{label,th}'), '') is null
      or nullif(btrim(v_item #>> '{label,en}'), '') is null
      or nullif(btrim(v_item #>> '{description,th}'), '') is null
      or nullif(btrim(v_item #>> '{description,en}'), '') is null
      or v_quantity_text is null or char_length(v_quantity_text) > 4 or v_quantity_text !~ '^(0|[1-9][0-9]*)$'
      or jsonb_typeof(v_item -> 'unitAmountSatang') <> 'string'
      or v_unit_amount_text is null or char_length(v_unit_amount_text) > 11 or v_unit_amount_text !~ '^-?(0|[1-9][0-9]*)$'
      or jsonb_typeof(v_item -> 'lineTotalSatang') <> 'string'
      or v_line_total_text is null or char_length(v_line_total_text) > 11 or v_line_total_text !~ '^-?(0|[1-9][0-9]*)$'
    then
      raise exception 'invalid_quote_item';
    end if;

    if v_quantity_text::numeric not between 1 and 1000
      or v_unit_amount_text::numeric not between v_money_min and v_money_max
      or v_line_total_text::numeric not between v_money_min and v_money_max
      or v_line_total_text::numeric <> v_unit_amount_text::numeric * v_quantity_text::numeric
    then
      raise exception 'invalid_quote_item';
    end if;

    v_quantity := v_quantity_text::integer;
    v_unit_amount_satang := v_unit_amount_text::bigint;
    v_line_total_satang := v_line_total_text::bigint;
    v_item_total := v_item_total + v_line_total_text::numeric;
  end loop;

  if v_item_total <> v_total_satang::numeric then
    raise exception 'quote_total_mismatch';
  end if;

  select coalesce(max(q.version), 0) + 1 into v_version
  from public.quotes as q
  where q.request_id = p_request_id;

  update public.quotes as q
  set status = 'superseded'
  where q.request_id = p_request_id
    and q.status = 'sent';

  insert into public.quotes (
    request_id,
    version,
    status,
    scope_summary,
    total_satang,
    deposit_percent,
    deposit_satang,
    free_revision_count,
    estimated_duration_days,
    estimated_duration_min_days,
    estimated_duration_max_days,
    proposed_deadline,
    terms_document_slug,
    terms_document_version,
    expires_at,
    created_by,
    submission_key,
    submission_payload_fingerprint
  ) values (
    p_request_id,
    v_version,
    'draft',
    v_scope,
    v_total_satang,
    v_deposit_percent,
    round(v_total_satang::numeric * v_deposit_percent::numeric / 100)::bigint,
    v_free_revisions,
    v_duration_max,
    v_duration_min,
    v_duration_max,
    v_proposed_deadline,
    v_terms_slug,
    v_terms_version,
    v_expires_at,
    auth.uid(),
    v_submission_key,
    v_payload_fingerprint
  ) returning * into v_quote;

  for v_item in select value from jsonb_array_elements(v_items)
  loop
    insert into public.quote_items (
      quote_id,
      item_type,
      label_snapshot,
      description_snapshot,
      quantity,
      unit_amount_satang,
      line_total_satang,
      display_order
    ) values (
      v_quote.id,
      v_item ->> 'itemType',
      v_item -> 'label',
      coalesce(v_item -> 'description', '{}'::jsonb),
      (v_item ->> 'quantity')::integer,
      (v_item ->> 'unitAmountSatang')::bigint,
      (v_item ->> 'lineTotalSatang')::bigint,
      v_order
    );
    v_order := v_order + 1;
  end loop;

  update public.quotes as q
  set status = 'sent', sent_at = now()
  where q.id = v_quote.id
  returning * into v_quote;

  update public.commission_requests
  set status = 'quoted'
  where id = p_request_id;

  insert into public.audit_logs (
    actor_user_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    before_state,
    after_state
  ) values (
    auth.uid(),
    'admin',
    'send_commission_quote',
    'quote',
    v_quote.id,
    null,
    to_jsonb(v_quote)
  );

  return query select v_quote.id, v_quote.version, v_quote.status;
end;
$$;

create function public.admin_save_and_send_quote(
  p_request_id uuid,
  p_payload jsonb
) returns table(quote_id uuid, version integer, status text)
language sql
security definer
set search_path = ''
as $$
  select * from private.save_and_send_quote(p_request_id, p_payload);
$$;

revoke all on function private.save_and_send_quote(uuid, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.admin_save_and_send_quote(uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_save_and_send_quote(uuid, jsonb)
  to authenticated;

revoke insert, update, delete on public.quotes from authenticated;
revoke insert, update, delete on public.quote_items from authenticated;

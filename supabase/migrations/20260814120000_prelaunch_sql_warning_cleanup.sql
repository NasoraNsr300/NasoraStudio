do $migration$
declare
  v_original text;
  v_definition text;
begin
  select pg_get_functiondef('private.save_and_send_quote(uuid, jsonb)'::regprocedure)
  into v_original;

  v_definition := replace(v_original, E'  v_quantity integer;\n', '');
  v_definition := replace(v_definition, E'  v_unit_amount_satang bigint;\n', '');
  v_definition := replace(v_definition, E'  v_line_total_satang bigint;\n', '');
  v_definition := replace(v_definition, E'    v_quantity := v_quantity_text::integer;\n', '');
  v_definition := replace(v_definition, E'    v_unit_amount_satang := v_unit_amount_text::bigint;\n', '');
  v_definition := replace(v_definition, E'    v_line_total_satang := v_line_total_text::bigint;\n', '');

  if v_definition = v_original then
    raise exception 'save_and_send_quote definition did not match the expected lint-only cleanup';
  end if;
  if v_definition like '%v_quantity integer;%'
    or v_definition like '%v_unit_amount_satang bigint;%'
    or v_definition like '%v_line_total_satang bigint;%'
    or v_definition like '%v_quantity := v_quantity_text::integer;%'
    or v_definition like '%v_unit_amount_satang := v_unit_amount_text::bigint;%'
    or v_definition like '%v_line_total_satang := v_line_total_text::bigint;%'
  then
    raise exception 'save_and_send_quote cleanup was incomplete';
  end if;

  execute v_definition;
end;
$migration$;

do $migration$
declare
  v_original text;
  v_definition text;
begin
  select pg_get_functiondef('private.authorize_payment_slip(uuid, uuid, text, bigint, uuid, uuid)'::regprocedure)
  into v_original;

  v_definition := replace(v_original, E'  v_quote public.quotes%rowtype;\n', '');
  v_definition := replace(
    v_definition,
    E'  select quote.* into v_quote\n  from public.quotes quote\n',
    E'  perform 1\n  from public.quotes quote\n'
  );

  if v_definition = v_original then
    raise exception 'authorize_payment_slip definition did not match the expected lint-only cleanup';
  end if;
  if v_definition like '%v_quote public.quotes%rowtype;%'
    or v_definition like '%select quote.* into v_quote%'
  then
    raise exception 'authorize_payment_slip cleanup was incomplete';
  end if;

  execute v_definition;
end;
$migration$;

do $migration$
declare
  v_original text;
  v_definition text;
begin
  select pg_get_functiondef('private.create_payment_intent(uuid, uuid, bigint, uuid)'::regprocedure)
  into v_original;

  v_definition := replace(v_original, E'  v_request public.commission_requests%rowtype;\n', '');
  v_definition := replace(
    v_definition,
    E'  select * into v_request\n  from public.commission_requests request\n',
    E'  perform 1\n  from public.commission_requests request\n'
  );

  if v_definition = v_original then
    raise exception 'create_payment_intent definition did not match the expected lint-only cleanup';
  end if;
  if v_definition like '%v_request public.commission_requests%rowtype;%'
    or v_definition like '%select * into v_request%'
  then
    raise exception 'create_payment_intent cleanup was incomplete';
  end if;

  execute v_definition;
end;
$migration$;

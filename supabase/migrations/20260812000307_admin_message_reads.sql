create table public.admin_notification_reads (
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  source_key text not null check (
    char_length(source_key) between 39 and 120
    and source_key ~ '^(estimate|slip|message|deadline):[0-9a-f-]{36}(:[0-9a-f-]{36})?$'
  ),
  read_at timestamptz not null default now(),
  primary key (admin_user_id, source_key)
);

create index admin_notification_reads_recent_idx
  on public.admin_notification_reads (admin_user_id, read_at desc);

alter table public.admin_notification_reads enable row level security;

create policy admin_notification_reads_select_sole_admin
on public.admin_notification_reads for select to authenticated
using ((select private.is_admin()) and admin_user_id = (select auth.uid()));

create or replace function public.admin_mark_notification_reads(p_source_keys text[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not private.is_admin() or auth.uid() is null then
    raise exception 'admin_required';
  end if;
  if p_source_keys is null or cardinality(p_source_keys) < 1 or cardinality(p_source_keys) > 50 then
    raise exception 'invalid_notification_keys';
  end if;
  if exists (
    select 1 from unnest(p_source_keys) as source_key
    where char_length(source_key) not between 39 and 120
      or source_key !~ '^(estimate|slip|message|deadline):[0-9a-f-]{36}(:[0-9a-f-]{36})?$'
  ) then
    raise exception 'invalid_notification_keys';
  end if;

  insert into public.admin_notification_reads (admin_user_id, source_key, read_at)
  select auth.uid(), source_key, now()
  from (select distinct unnest(p_source_keys) as source_key) keys
  on conflict (admin_user_id, source_key) do update set read_at = excluded.read_at;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.admin_mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_message_id uuid;
begin
  if not private.is_admin() or auth.uid() is null then
    raise exception 'admin_required';
  end if;
  if not exists (select 1 from public.conversations where id = p_conversation_id) then
    raise exception 'conversation_not_found';
  end if;

  select message.id into v_message_id
  from public.messages message
  where message.conversation_id = p_conversation_id and message.deleted_at is null
  order by message.created_at desc, message.id desc
  limit 1;

  insert into public.conversation_reads (conversation_id, user_id, last_read_message_id, last_read_at)
  values (p_conversation_id, auth.uid(), v_message_id, now())
  on conflict (conversation_id, user_id) do update
    set last_read_message_id = excluded.last_read_message_id,
        last_read_at = excluded.last_read_at;
end;
$$;

revoke all on public.admin_notification_reads from public, anon, authenticated, service_role;
grant select on public.admin_notification_reads to authenticated;

revoke all on function public.admin_mark_notification_reads(text[]), public.admin_mark_conversation_read(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_mark_notification_reads(text[]), public.admin_mark_conversation_read(uuid)
  to authenticated;

create extension if not exists pgcrypto;

create schema if not exists private;

create table public.commission_requests (
  id uuid primary key default gen_random_uuid(),
  requester_type text not null check (requester_type in ('member', 'guest')),
  user_id uuid references auth.users(id) on delete restrict,
  member_display_name_snapshot text,
  guest_display_name text,
  guest_contact_snapshot jsonb,
  contact_snapshot jsonb not null default '{}'::jsonb,
  category_slug text not null,
  category_name_snapshot jsonb not null,
  service_type_slug text not null,
  service_type_name_snapshot jsonb not null,
  usage_type text not null check (usage_type in ('personal', 'commercial')),
  budget_min_satang bigint check (budget_min_satang is null or budget_min_satang >= 0),
  budget_max_satang bigint check (budget_max_satang is null or budget_max_satang >= 0),
  requested_deadline date,
  description text not null,
  mood_and_style text,
  extra_character_count integer not null default 0 check (extra_character_count >= 0),
  background_level integer not null default 0 check (background_level >= 0),
  prop_count integer not null default 0 check (prop_count >= 0),
  status text not null default 'submitted' check (
    status in ('submitted', 'reviewing', 'quoted', 'declined', 'cancelled', 'converted', 'closed')
  ),
  submitted_at timestamptz not null default now(),
  closed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commission_request_identity_check check (
    (
      requester_type = 'member'
      and user_id is not null
      and member_display_name_snapshot is not null
      and guest_display_name is null
      and guest_contact_snapshot is null
    )
    or
    (
      requester_type = 'guest'
      and user_id is null
      and member_display_name_snapshot is null
      and guest_display_name is not null
      and guest_contact_snapshot is not null
    )
  ),
  constraint commission_request_budget_range_check check (
    budget_min_satang is null
    or budget_max_satang is null
    or budget_min_satang <= budget_max_satang
  )
);

create table public.request_answers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.commission_requests(id) on delete cascade,
  field_key text not null,
  field_label_snapshot jsonb not null,
  value jsonb not null,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  constraint request_answer_field_unique unique (request_id, field_key)
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.commission_requests(id) on delete restrict,
  version integer not null check (version > 0),
  status text not null default 'draft' check (
    status in ('draft', 'sent', 'accepted', 'declined', 'expired', 'closed', 'superseded')
  ),
  scope_summary jsonb not null default '{}'::jsonb,
  total_satang bigint not null check (total_satang >= 0),
  deposit_percent integer not null default 50 check (deposit_percent between 0 and 100),
  deposit_satang bigint not null check (deposit_satang >= 0 and deposit_satang <= total_satang),
  free_revision_count integer not null default 4 check (free_revision_count >= 0),
  estimated_duration_days integer check (estimated_duration_days is null or estimated_duration_days > 0),
  proposed_deadline date,
  terms_document_slug text,
  terms_document_version integer check (terms_document_version is null or terms_document_version > 0),
  valid_from timestamptz not null default now(),
  expires_at timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  closed_at timestamptz,
  created_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quote_request_version_unique unique (request_id, version),
  constraint quote_expiry_after_valid_from check (expires_at is null or expires_at > valid_from)
);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  item_type text not null default 'base' check (
    item_type in ('base', 'character', 'background', 'prop', 'rush', 'discount', 'other')
  ),
  label_snapshot jsonb not null,
  description_snapshot jsonb not null default '{}'::jsonb,
  quantity integer not null default 1 check (quantity > 0),
  unit_amount_satang bigint not null,
  line_total_satang bigint not null,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  constraint quote_item_amount_check check (line_total_satang = unit_amount_satang * quantity),
  constraint quote_item_display_order_unique unique (quote_id, display_order)
);

create table public.status_workflows (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique,
  name jsonb not null,
  service_type_slug text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index status_workflows_one_active_default
  on public.status_workflows (is_default)
  where is_default and is_active and archived_at is null;

create table public.status_definitions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.status_workflows(id) on delete restrict,
  stable_key text not null,
  label jsonb not null,
  public_description jsonb not null default '{}'::jsonb,
  private_description jsonb not null default '{}'::jsonb,
  display_order integer not null check (display_order >= 0),
  is_terminal boolean not null default false,
  customer_visible boolean not null default true,
  starts_work boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint status_definition_key_unique unique (workflow_id, stable_key),
  constraint status_definition_order_unique unique (workflow_id, display_order)
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.commission_requests(id) on delete restrict,
  accepted_quote_id uuid unique references public.quotes(id) on delete restrict,
  customer_type text not null check (customer_type in ('member', 'guest')),
  user_id uuid references auth.users(id) on delete restrict,
  member_display_name_snapshot text,
  guest_display_name text,
  guest_contact_snapshot jsonb,
  contact_snapshot jsonb not null default '{}'::jsonb,
  category_slug text not null,
  category_name_snapshot jsonb not null,
  service_type_slug text not null,
  service_type_name_snapshot jsonb not null,
  workflow_id uuid not null references public.status_workflows(id) on delete restrict,
  status_id uuid not null references public.status_definitions(id) on delete restrict,
  original_quote_total_satang bigint not null check (original_quote_total_satang >= 0),
  current_total_satang bigint not null check (current_total_satang >= 0),
  deposit_percent integer not null default 50 check (deposit_percent between 0 and 100),
  deposit_verified_at timestamptz,
  default_free_revisions integer not null default 4 check (default_free_revisions >= 0),
  deadline date,
  work_started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  refund_policy_result text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_customer_identity_check check (
    (
      customer_type = 'member'
      and user_id is not null
      and member_display_name_snapshot is not null
      and guest_display_name is null
      and guest_contact_snapshot is null
    )
    or
    (
      customer_type = 'guest'
      and user_id is null
      and member_display_name_snapshot is null
      and guest_display_name is not null
      and guest_contact_snapshot is not null
    )
  )
);

create table public.job_charge_adjustments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete restrict,
  category text not null check (category in ('character', 'background', 'prop', 'rush', 'discount', 'scope_change', 'other')),
  reason jsonb not null,
  amount_satang bigint not null check (amount_satang <> 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.job_status_history (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete restrict,
  from_status_id uuid references public.status_definitions(id) on delete restrict,
  to_status_id uuid not null references public.status_definitions(id) on delete restrict,
  public_note text,
  private_note text,
  changed_by uuid not null references auth.users(id) on delete restrict,
  changed_at timestamptz not null default now()
);

create table public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete restrict,
  customer_display_name text not null,
  category_name_snapshot jsonb not null,
  service_type_name_snapshot jsonb not null,
  status_label_snapshot jsonb not null,
  deadline date,
  default_order_at timestamptz not null,
  manual_rank numeric(12, 4),
  override_reason text,
  is_visible boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint queue_manual_override_reason_check check (
    manual_rank is null or nullif(btrim(override_reason), '') is not null
  )
);

create unique index queue_entries_one_active_per_job
  on public.queue_entries (job_id)
  where archived_at is null;

create index queue_entries_public_order
  on public.queue_entries (manual_rank nulls last, default_order_at, created_at)
  where is_visible and archived_at is null;

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete restrict,
  actor_role text not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index commission_requests_user_created_idx
  on public.commission_requests (user_id, created_at desc)
  where user_id is not null;

create index quotes_request_created_idx
  on public.quotes (request_id, created_at desc);

create index jobs_user_created_idx
  on public.jobs (user_id, created_at desc)
  where user_id is not null;

create index job_status_history_job_changed_idx
  on public.job_status_history (job_id, changed_at desc);


create index audit_logs_actor_user_idx
  on public.audit_logs (actor_user_id);
create index job_charge_adjustments_job_idx
  on public.job_charge_adjustments (job_id);
create index job_charge_adjustments_created_by_idx
  on public.job_charge_adjustments (created_by);
create index job_status_history_changed_by_idx
  on public.job_status_history (changed_by);
create index job_status_history_from_status_idx
  on public.job_status_history (from_status_id);
create index job_status_history_to_status_idx
  on public.job_status_history (to_status_id);
create index jobs_request_idx
  on public.jobs (request_id);
create index jobs_status_idx
  on public.jobs (status_id);
create index jobs_workflow_idx
  on public.jobs (workflow_id);
create index quotes_created_by_idx
  on public.quotes (created_by);


create function private.is_admin() returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

alter table public.commission_requests enable row level security;
alter table public.request_answers enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.status_workflows enable row level security;
alter table public.status_definitions enable row level security;
alter table public.jobs enable row level security;
alter table public.job_charge_adjustments enable row level security;
alter table public.job_status_history enable row level security;
alter table public.queue_entries enable row level security;
alter table public.audit_logs enable row level security;

create policy commission_requests_admin_insert
on public.commission_requests for insert to authenticated
with check ((select private.is_admin()));
create policy commission_requests_admin_update
on public.commission_requests for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy commission_requests_admin_delete
on public.commission_requests for delete to authenticated
using ((select private.is_admin()));

create policy commission_requests_select_own
on public.commission_requests for select to authenticated
using ((select private.is_admin()) or (select auth.uid()) = user_id);

create policy request_answers_admin_insert
on public.request_answers for insert to authenticated
with check ((select private.is_admin()));
create policy request_answers_admin_update
on public.request_answers for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy request_answers_admin_delete
on public.request_answers for delete to authenticated
using ((select private.is_admin()));

create policy request_answers_select_own
on public.request_answers for select to authenticated
using ((select private.is_admin()) or
  exists (
    select 1 from public.commission_requests request
    where request.id = request_id and request.user_id = (select auth.uid())
  )
);

create policy quotes_admin_insert
on public.quotes for insert to authenticated
with check ((select private.is_admin()));
create policy quotes_admin_update
on public.quotes for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy quotes_admin_delete
on public.quotes for delete to authenticated
using ((select private.is_admin()));

create policy quotes_select_own
on public.quotes for select to authenticated
using ((select private.is_admin()) or
  exists (
    select 1 from public.commission_requests request
    where request.id = request_id and request.user_id = (select auth.uid())
  )
);

create policy quote_items_admin_insert
on public.quote_items for insert to authenticated
with check ((select private.is_admin()));
create policy quote_items_admin_update
on public.quote_items for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy quote_items_admin_delete
on public.quote_items for delete to authenticated
using ((select private.is_admin()));

create policy quote_items_select_own
on public.quote_items for select to authenticated
using ((select private.is_admin()) or
  exists (
    select 1
    from public.quotes quote
    join public.commission_requests request on request.id = quote.request_id
    where quote.id = quote_id and request.user_id = (select auth.uid())
  )
);

create policy status_workflows_select_authenticated
on public.status_workflows for select to authenticated
using ((select private.is_admin()) or (is_active and archived_at is null));

create policy status_workflows_admin_insert
on public.status_workflows for insert to authenticated
with check ((select private.is_admin()));
create policy status_workflows_admin_update
on public.status_workflows for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy status_workflows_admin_delete
on public.status_workflows for delete to authenticated
using ((select private.is_admin()));

create policy status_definitions_select_authenticated
on public.status_definitions for select to authenticated
using ((select private.is_admin()) or archived_at is null);

create policy status_definitions_admin_insert
on public.status_definitions for insert to authenticated
with check ((select private.is_admin()));
create policy status_definitions_admin_update
on public.status_definitions for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy status_definitions_admin_delete
on public.status_definitions for delete to authenticated
using ((select private.is_admin()));

create policy jobs_admin_insert
on public.jobs for insert to authenticated
with check ((select private.is_admin()));
create policy jobs_admin_update
on public.jobs for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy jobs_admin_delete
on public.jobs for delete to authenticated
using ((select private.is_admin()));

create policy jobs_select_own
on public.jobs for select to authenticated
using ((select private.is_admin()) or (select auth.uid()) = user_id);

create policy job_charge_adjustments_admin_insert
on public.job_charge_adjustments for insert to authenticated
with check ((select private.is_admin()));
create policy job_charge_adjustments_admin_update
on public.job_charge_adjustments for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy job_charge_adjustments_admin_delete
on public.job_charge_adjustments for delete to authenticated
using ((select private.is_admin()));

create policy job_charge_adjustments_select_own
on public.job_charge_adjustments for select to authenticated
using ((select private.is_admin()) or
  exists (
    select 1 from public.jobs job
    where job.id = job_id and job.user_id = (select auth.uid())
  )
);

create policy job_status_history_admin_insert
on public.job_status_history for insert to authenticated
with check ((select private.is_admin()));
create policy job_status_history_admin_update
on public.job_status_history for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy job_status_history_admin_delete
on public.job_status_history for delete to authenticated
using ((select private.is_admin()));

create policy job_status_history_select_own
on public.job_status_history for select to authenticated
using ((select private.is_admin()) or
  exists (
    select 1 from public.jobs job
    where job.id = job_id and job.user_id = (select auth.uid())
  )
);

create policy queue_entries_admin_insert
on public.queue_entries for insert to authenticated
with check ((select private.is_admin()));
create policy queue_entries_admin_update
on public.queue_entries for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy queue_entries_admin_delete
on public.queue_entries for delete to authenticated
using ((select private.is_admin()));

create policy queue_entries_public_visible
on public.queue_entries for select to anon, authenticated
using (is_visible and archived_at is null);

create policy audit_logs_admin_select
on public.audit_logs for select to authenticated
using ((select private.is_admin()));

create policy audit_logs_admin_insert
on public.audit_logs for insert to authenticated
with check ((select private.is_admin()));

create view public.public_queue
with (security_invoker = true)
as
select
  row_number() over (
    order by manual_rank nulls last, default_order_at, created_at
  )::bigint as position,
  customer_display_name,
  category_name_snapshot,
  service_type_name_snapshot,
  status_label_snapshot,
  deadline
from public.queue_entries
where is_visible and archived_at is null;

revoke all on public.commission_requests, public.request_answers,
  public.quotes, public.quote_items, public.status_workflows,
  public.status_definitions, public.jobs, public.job_charge_adjustments,
  public.job_status_history, public.queue_entries, public.audit_logs
from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant usage on schema private to authenticated;

grant select, insert, update, delete on public.commission_requests to authenticated;
grant select, insert, update, delete on public.request_answers to authenticated;
grant select, insert, update, delete on public.quotes to authenticated;
grant select, insert, update, delete on public.quote_items to authenticated;
grant select, insert, update, delete on public.status_workflows to authenticated;
grant select, insert, update, delete on public.status_definitions to authenticated;
grant select, insert, update, delete on public.jobs to authenticated;
grant select, insert, update, delete on public.job_charge_adjustments to authenticated;
grant select, insert, update, delete on public.job_status_history to authenticated;
grant insert, update, delete on public.queue_entries to authenticated;
grant select on public.audit_logs to authenticated;
grant insert on public.audit_logs to authenticated;

grant select (
  customer_display_name,
  category_name_snapshot,
  service_type_name_snapshot,
  status_label_snapshot,
  deadline,
  default_order_at,
  manual_rank,
  is_visible,
  archived_at,
  created_at
) on public.queue_entries to anon, authenticated;

grant select on public.public_queue to anon, authenticated;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

insert into public.status_workflows (
  id,
  stable_key,
  name,
  is_default,
  is_active
) values (
  '00000000-0000-4000-8000-000000000001',
  'nasora_default',
  '{"th":"ขั้นตอนงานมาตรฐาน","en":"Default commission workflow"}'::jsonb,
  true,
  true
);

insert into public.status_definitions (
  id,
  workflow_id,
  stable_key,
  label,
  display_order,
  is_terminal,
  customer_visible,
  starts_work
) values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'waiting',   '{"th":"รอเริ่มงาน","en":"Waiting"}'::jsonb,   10, false, true,  false),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', 'sketching', '{"th":"กำลังร่าง","en":"Sketching"}'::jsonb,  20, false, true,  true),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001', 'coloring',  '{"th":"ลงสี","en":"Coloring"}'::jsonb,       30, false, true,  false),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000001', 'review',    '{"th":"รอตรวจ","en":"Review"}'::jsonb,        40, false, true,  false),
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000001', 'delivery',  '{"th":"ส่งมอบงาน","en":"Delivery"}'::jsonb,   50, false, true,  false),
  ('00000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-000000000001', 'completed', '{"th":"เสร็จสิ้น","en":"Completed"}'::jsonb,   60, true,  true,  false),
  ('00000000-0000-4000-8000-000000000107', '00000000-0000-4000-8000-000000000001', 'cancelled', '{"th":"ยกเลิก","en":"Cancelled"}'::jsonb,     70, true,  true,  false);

create function private.set_updated_at() returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger commission_requests_set_updated_at
before update on public.commission_requests
for each row execute function private.set_updated_at();

create trigger quotes_set_updated_at
before update on public.quotes
for each row execute function private.set_updated_at();

create trigger status_workflows_set_updated_at
before update on public.status_workflows
for each row execute function private.set_updated_at();

create trigger status_definitions_set_updated_at
before update on public.status_definitions
for each row execute function private.set_updated_at();

create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function private.set_updated_at();

create trigger queue_entries_set_updated_at
before update on public.queue_entries
for each row execute function private.set_updated_at();

create function private.enforce_quote_immutability() returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status <> 'draft'
    and (
      to_jsonb(new) - array[
        'status', 'sent_at', 'accepted_at', 'declined_at', 'closed_at', 'updated_at'
      ]::text[]
    ) is distinct from (
      to_jsonb(old) - array[
        'status', 'sent_at', 'accepted_at', 'declined_at', 'closed_at', 'updated_at'
      ]::text[]
    )
  then
    raise exception 'quote_snapshot_is_immutable';
  end if;

  return new;
end;
$$;

create trigger quotes_enforce_immutability
before update on public.quotes
for each row execute function private.enforce_quote_immutability();

create function private.enforce_quote_item_immutability() returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_quote_id uuid;
  v_status text;
begin
  v_quote_id := case when tg_op = 'DELETE' then old.quote_id else new.quote_id end;

  select status into v_status
  from public.quotes
  where id = v_quote_id;

  if v_status is distinct from 'draft' then
    raise exception 'quote_snapshot_is_immutable';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger quote_items_enforce_immutability
before insert or update or delete on public.quote_items
for each row execute function private.enforce_quote_item_immutability();

create function private.adjust_job_total(
  p_job_id uuid,
  p_amount_satang bigint,
  p_category text,
  p_reason_th text,
  p_reason_en text default null
) returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.jobs%rowtype;
  v_after public.jobs%rowtype;
  v_new_total bigint;
begin
  if not private.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if p_amount_satang = 0 then
    raise exception 'adjustment_must_be_nonzero';
  end if;

  select * into v_before
  from public.jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'job_not_found';
  end if;

  v_new_total := v_before.current_total_satang + p_amount_satang;
  if v_new_total < 0 then
    raise exception 'job_total_cannot_be_negative';
  end if;

  insert into public.job_charge_adjustments (
    job_id,
    category,
    reason,
    amount_satang,
    created_by
  ) values (
    p_job_id,
    p_category,
    jsonb_build_object('th', p_reason_th, 'en', p_reason_en),
    p_amount_satang,
    auth.uid()
  );

  update public.jobs
  set current_total_satang = v_new_total
  where id = p_job_id
  returning * into v_after;

  insert into public.audit_logs (
    actor_user_id, actor_role, action, entity_type, entity_id,
    before_state, after_state, reason
  ) values (
    auth.uid(), 'admin', 'adjust_total', 'job', p_job_id,
    to_jsonb(v_before), to_jsonb(v_after), p_reason_th
  );

  return v_new_total;
end;
$$;

create function private.change_job_status(
  p_job_id uuid,
  p_new_status_id uuid,
  p_public_note text default null,
  p_private_note text default null
) returns void
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

  select * into v_before
  from public.jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'job_not_found';
  end if;

  select * into v_status
  from public.status_definitions
  where id = p_new_status_id and archived_at is null;

  if not found or v_status.workflow_id <> v_before.workflow_id then
    raise exception 'status_not_in_job_workflow';
  end if;

  insert into public.job_status_history (
    job_id,
    from_status_id,
    to_status_id,
    public_note,
    private_note,
    changed_by
  ) values (
    p_job_id,
    v_before.status_id,
    p_new_status_id,
    p_public_note,
    p_private_note,
    auth.uid()
  );

  update public.jobs
  set
    status_id = p_new_status_id,
    work_started_at = case
      when v_status.starts_work and work_started_at is null then now()
      else work_started_at
    end,
    completed_at = case
      when v_status.stable_key = 'completed' then now()
      else completed_at
    end,
    cancelled_at = case
      when v_status.stable_key = 'cancelled' then now()
      else cancelled_at
    end
  where id = p_job_id
  returning * into v_after;

  update public.queue_entries
  set
    status_label_snapshot = v_status.label,
    archived_at = case
      when v_status.is_terminal then coalesce(archived_at, now())
      else null
    end
  where job_id = p_job_id and archived_at is null;

  insert into public.audit_logs (
    actor_user_id, actor_role, action, entity_type, entity_id,
    before_state, after_state, reason
  ) values (
    auth.uid(), 'admin', 'change_status', 'job', p_job_id,
    to_jsonb(v_before), to_jsonb(v_after), p_private_note
  );
end;
$$;

create function private.reorder_queue_entry(
  p_queue_entry_id uuid,
  p_manual_rank integer,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.queue_entries%rowtype;
  v_after public.queue_entries%rowtype;
begin
  if not private.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if p_manual_rank is not null and nullif(btrim(p_reason), '') is null then
    raise exception 'queue_override_reason_required';
  end if;

  select * into v_before
  from public.queue_entries
  where id = p_queue_entry_id
  for update;

  if not found then
    raise exception 'queue_entry_not_found';
  end if;

  update public.queue_entries
  set manual_rank = p_manual_rank, override_reason = p_reason
  where id = p_queue_entry_id
  returning * into v_after;

  insert into public.audit_logs (
    actor_user_id, actor_role, action, entity_type, entity_id,
    before_state, after_state, reason
  ) values (
    auth.uid(), 'admin', 'reorder_queue', 'queue_entry', p_queue_entry_id,
    to_jsonb(v_before), to_jsonb(v_after), p_reason
  );
end;
$$;

revoke update, delete on public.job_charge_adjustments from authenticated;
revoke update, delete on public.job_status_history from authenticated;
revoke update, delete on public.audit_logs from authenticated;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.enforce_quote_immutability() from public, anon, authenticated;
revoke all on function private.enforce_quote_item_immutability() from public, anon, authenticated;
revoke all on function private.adjust_job_total(uuid, bigint, text, text, text) from public, anon;
revoke all on function private.change_job_status(uuid, uuid, text, text) from public, anon;
revoke all on function private.reorder_queue_entry(uuid, integer, text) from public, anon;

grant execute on function private.adjust_job_total(uuid, bigint, text, text, text) to authenticated;
grant execute on function private.change_job_status(uuid, uuid, text, text) to authenticated;
grant execute on function private.reorder_queue_entry(uuid, integer, text) to authenticated;

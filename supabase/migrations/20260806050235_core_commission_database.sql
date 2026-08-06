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

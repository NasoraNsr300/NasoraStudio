create table public.estimate_request_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_type_slug text not null check (service_type_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 16384),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, service_type_slug)
);

create index estimate_request_drafts_user_updated_idx
on public.estimate_request_drafts (user_id, updated_at desc);

create trigger estimate_request_drafts_set_updated_at
before update on public.estimate_request_drafts
for each row execute function private.set_updated_at();

alter table public.estimate_request_drafts enable row level security;

create policy estimate_request_drafts_select_own
on public.estimate_request_drafts for select to authenticated
using ((select auth.uid()) = user_id);

create policy estimate_request_drafts_insert_own
on public.estimate_request_drafts for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy estimate_request_drafts_update_own
on public.estimate_request_drafts for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy estimate_request_drafts_delete_own
on public.estimate_request_drafts for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.estimate_request_drafts from public;
revoke all on public.estimate_request_drafts from anon;
grant select, insert, update, delete on public.estimate_request_drafts to authenticated;

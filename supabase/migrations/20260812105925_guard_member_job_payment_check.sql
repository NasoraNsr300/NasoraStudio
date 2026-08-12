-- Do not expose the internal paid predicate directly: it can answer for any job.
-- The policy-facing wrapper binds the lookup to auth.uid() before delegating.
revoke all on function private.job_is_fully_paid(uuid)
from public, anon, authenticated, service_role;

create or replace function private.member_job_is_fully_paid(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.jobs job
    where job.id = p_job_id
      and job.customer_type = 'member'
      and job.user_id = (select auth.uid())
      and private.job_is_fully_paid(job.id)
  )
$$;

revoke all on function private.member_job_is_fully_paid(uuid)
from public, anon, authenticated, service_role;

grant usage on schema private to authenticated;
grant execute on function private.member_job_is_fully_paid(uuid) to authenticated;

drop policy if exists deliveries_select_owner_paid on public.deliveries;
create policy deliveries_select_owner_paid
on public.deliveries
for select
to authenticated
using (
  (select private.is_admin()) or (
    hidden_at is null
    and deleted_at is null
    and expires_at > now()
    and exists (
      select 1
      from public.jobs job
      where job.id = job_id
        and job.customer_type = 'member'
        and job.user_id = (select auth.uid())
    )
    and (admin_override or private.member_job_is_fully_paid(job_id))
  )
);

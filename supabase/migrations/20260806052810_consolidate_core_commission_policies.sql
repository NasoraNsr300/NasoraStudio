do $$
declare
  v_table text;
  v_action text;
begin
  foreach v_table in array array[
    'commission_requests',
    'request_answers',
    'quotes',
    'quote_items',
    'status_workflows',
    'status_definitions',
    'jobs',
    'job_charge_adjustments',
    'job_status_history',
    'queue_entries'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', v_table || '_admin_all', v_table);

    foreach v_action in array array['insert', 'update', 'delete']
    loop
      if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = v_table
          and policyname = v_table || '_admin_' || v_action
      ) then
        if v_action = 'insert' then
          execute format(
            'create policy %I on public.%I for insert to authenticated with check ((select private.is_admin()))',
            v_table || '_admin_insert', v_table
          );
        elsif v_action = 'update' then
          execute format(
            'create policy %I on public.%I for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',
            v_table || '_admin_update', v_table
          );
        else
          execute format(
            'create policy %I on public.%I for delete to authenticated using ((select private.is_admin()))',
            v_table || '_admin_delete', v_table
          );
        end if;
      end if;
    end loop;
  end loop;
end;
$$;

alter policy commission_requests_select_own
on public.commission_requests
using ((select private.is_admin()) or (select auth.uid()) = user_id);

alter policy request_answers_select_own
on public.request_answers
using (
  (select private.is_admin()) or exists (
    select 1 from public.commission_requests request
    where request.id = request_id and request.user_id = (select auth.uid())
  )
);

alter policy quotes_select_own
on public.quotes
using (
  (select private.is_admin()) or exists (
    select 1 from public.commission_requests request
    where request.id = request_id and request.user_id = (select auth.uid())
  )
);

alter policy quote_items_select_own
on public.quote_items
using (
  (select private.is_admin()) or exists (
    select 1
    from public.quotes quote
    join public.commission_requests request on request.id = quote.request_id
    where quote.id = quote_id and request.user_id = (select auth.uid())
  )
);

alter policy status_workflows_select_authenticated
on public.status_workflows
using ((select private.is_admin()) or (is_active and archived_at is null));

alter policy status_definitions_select_authenticated
on public.status_definitions
using ((select private.is_admin()) or archived_at is null);

alter policy jobs_select_own
on public.jobs
using ((select private.is_admin()) or (select auth.uid()) = user_id);

alter policy job_charge_adjustments_select_own
on public.job_charge_adjustments
using (
  (select private.is_admin()) or exists (
    select 1 from public.jobs job
    where job.id = job_id and job.user_id = (select auth.uid())
  )
);

alter policy job_status_history_select_own
on public.job_status_history
using (
  (select private.is_admin()) or exists (
    select 1 from public.jobs job
    where job.id = job_id and job.user_id = (select auth.uid())
  )
);

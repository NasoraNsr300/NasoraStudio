create index if not exists audit_logs_actor_user_idx
  on public.audit_logs (actor_user_id);
create index if not exists job_charge_adjustments_job_idx
  on public.job_charge_adjustments (job_id);
create index if not exists job_charge_adjustments_created_by_idx
  on public.job_charge_adjustments (created_by);
create index if not exists job_status_history_changed_by_idx
  on public.job_status_history (changed_by);
create index if not exists job_status_history_from_status_idx
  on public.job_status_history (from_status_id);
create index if not exists job_status_history_to_status_idx
  on public.job_status_history (to_status_id);
create index if not exists jobs_request_idx
  on public.jobs (request_id);
create index if not exists jobs_status_idx
  on public.jobs (status_id);
create index if not exists jobs_workflow_idx
  on public.jobs (workflow_id);
create index if not exists quotes_created_by_idx
  on public.quotes (created_by);

-- The member delivery SELECT policy calls this SECURITY DEFINER predicate.
-- Keep its execute surface minimal while allowing authenticated policy checks.
revoke all on function private.job_is_fully_paid(uuid)
from public, anon, authenticated, service_role;

grant usage on schema private to authenticated;
grant execute on function private.job_is_fully_paid(uuid) to authenticated;

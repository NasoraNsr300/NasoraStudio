revoke execute on function public.submit_commission_request(jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function public.cancel_own_commission_request(uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.submit_commission_request(jsonb)
  to anon, authenticated;
grant execute on function public.cancel_own_commission_request(uuid)
  to authenticated;

revoke execute on function public.admin_save_commission_album(uuid, text, jsonb, jsonb, uuid, text, boolean, boolean, integer) from anon, service_role;
revoke execute on function public.admin_set_commission_album_archive(uuid, boolean, text) from anon, service_role;
revoke execute on function public.admin_save_commission_service(uuid, uuid, text, jsonb, jsonb, jsonb, uuid, text, integer, jsonb, text[], boolean, integer) from anon, service_role;
revoke execute on function public.admin_set_commission_service_archive(uuid, boolean, text) from anon, service_role;
revoke execute on function public.admin_replace_commission_service_prices(uuid, jsonb) from anon, service_role;
revoke execute on function public.admin_create_commission_catalog_media(text, text, text, integer, integer, jsonb) from anon, service_role;

grant execute on function public.admin_save_commission_album(uuid, text, jsonb, jsonb, uuid, text, boolean, boolean, integer) to authenticated;
grant execute on function public.admin_set_commission_album_archive(uuid, boolean, text) to authenticated;
grant execute on function public.admin_save_commission_service(uuid, uuid, text, jsonb, jsonb, jsonb, uuid, text, integer, jsonb, text[], boolean, integer) to authenticated;
grant execute on function public.admin_set_commission_service_archive(uuid, boolean, text) to authenticated;
grant execute on function public.admin_replace_commission_service_prices(uuid, jsonb) to authenticated;
grant execute on function public.admin_create_commission_catalog_media(text, text, text, integer, integer, jsonb) to authenticated;

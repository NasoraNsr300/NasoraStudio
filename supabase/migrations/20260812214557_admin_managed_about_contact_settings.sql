alter table public.site_settings
  add column about_biography jsonb not null default '{"th":"Nasora เป็นนักวาดอิสระที่สร้างสรรค์งานตัวละคร เรื่องราว และคอมมิชชันในบรรยากาศอบอุ่นนุ่มนวล","en":"Nasora is an independent illustrator creating character-led artwork, stories, and commission pieces with a warm, atmospheric finish."}'::jsonb,
  add column about_contact jsonb not null default '{"th":"หากมีคำถามเกี่ยวกับคอมมิชชัน คิว หรืออยากทักทาย เริ่มต้นพูดคุยที่ Discord ได้เลย","en":"For commission questions, availability, or a friendly hello, start with Discord."}'::jsonb,
  add column contact_email text not null default 'nasora.nsr300@gmail.com',
  add column instagram_url text not null default '';

alter table public.site_settings
  add constraint site_settings_about_biography_check check (
    jsonb_typeof(about_biography) = 'object'
    and nullif(btrim(about_biography ->> 'th'), '') is not null
    and nullif(btrim(about_biography ->> 'en'), '') is not null
    and about_biography - 'th' - 'en' = '{}'::jsonb
    and char_length(about_biography ->> 'th') <= 1000
    and char_length(about_biography ->> 'en') <= 1000
  ),
  add constraint site_settings_about_contact_check check (
    jsonb_typeof(about_contact) = 'object'
    and nullif(btrim(about_contact ->> 'th'), '') is not null
    and nullif(btrim(about_contact ->> 'en'), '') is not null
    and about_contact - 'th' - 'en' = '{}'::jsonb
    and char_length(about_contact ->> 'th') <= 1000
    and char_length(about_contact ->> 'en') <= 1000
  ),
  add constraint site_settings_contact_email_check check (
    char_length(btrim(contact_email)) between 3 and 320 and position('@' in contact_email) > 1
  ),
  add constraint site_settings_instagram_url_check check (
    instagram_url = '' or (char_length(instagram_url) <= 500 and instagram_url ~ '^https://')
  );

grant select (about_biography, about_contact, contact_email, instagram_url)
on public.site_settings to anon, authenticated;

create or replace function public.admin_get_site_settings_v2()
returns table (
  about_biography jsonb,
  about_contact jsonb,
  admin_note text,
  business_hours text,
  commissions_open boolean,
  contact_email text,
  discord_contact text,
  home_description jsonb,
  home_heading jsonb,
  instagram_url text,
  particles_enabled boolean,
  queue_capacity integer,
  shooting_stars_enabled boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin_access_required';
  end if;
  return query select
    settings.about_biography,
    settings.about_contact,
    settings.admin_note,
    settings.business_hours,
    settings.commissions_open,
    settings.contact_email,
    settings.discord_contact,
    settings.home_description,
    settings.home_heading,
    settings.instagram_url,
    settings.particles_enabled,
    settings.queue_capacity,
    settings.shooting_stars_enabled,
    settings.updated_at
  from public.site_settings as settings
  where settings.id = true;
end;
$$;

create or replace function public.admin_save_site_settings_v2(
  p_about_biography jsonb,
  p_about_contact jsonb,
  p_admin_note text,
  p_business_hours text,
  p_commissions_open boolean,
  p_contact_email text,
  p_discord_contact text,
  p_home_description jsonb,
  p_home_heading jsonb,
  p_instagram_url text,
  p_particles_enabled boolean,
  p_queue_capacity integer,
  p_shooting_stars_enabled boolean
)
returns table (
  about_biography jsonb,
  about_contact jsonb,
  admin_note text,
  business_hours text,
  commissions_open boolean,
  contact_email text,
  discord_contact text,
  home_description jsonb,
  home_heading jsonb,
  instagram_url text,
  particles_enabled boolean,
  queue_capacity integer,
  shooting_stars_enabled boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
begin
  if not (select private.is_admin()) then
    raise exception 'admin_access_required';
  end if;

  select to_jsonb(settings.*) into v_before
  from public.site_settings as settings
  where settings.id = true
  for update;

  update public.site_settings as settings set
    about_biography = p_about_biography,
    about_contact = p_about_contact,
    admin_note = btrim(coalesce(p_admin_note, '')),
    business_hours = btrim(p_business_hours),
    commissions_open = p_commissions_open,
    contact_email = btrim(p_contact_email),
    discord_contact = btrim(p_discord_contact),
    home_description = p_home_description,
    home_heading = p_home_heading,
    instagram_url = btrim(coalesce(p_instagram_url, '')),
    particles_enabled = p_particles_enabled,
    queue_capacity = p_queue_capacity,
    shooting_stars_enabled = p_shooting_stars_enabled,
    updated_at = now()
  where settings.id = true;

  insert into public.audit_logs (actor_user_id, actor_role, action, entity_type, before_state, after_state, reason)
  select (select auth.uid()), 'admin', 'update_site_settings', 'site_settings',
    v_before - 'admin_note', to_jsonb(settings.*) - 'admin_note', 'Updated from Admin settings'
  from public.site_settings as settings where settings.id = true;

  return query select
    settings.about_biography, settings.about_contact, settings.admin_note,
    settings.business_hours, settings.commissions_open, settings.contact_email,
    settings.discord_contact, settings.home_description, settings.home_heading,
    settings.instagram_url, settings.particles_enabled, settings.queue_capacity,
    settings.shooting_stars_enabled, settings.updated_at
  from public.site_settings as settings where settings.id = true;
end;
$$;

revoke all on function public.admin_get_site_settings_v2() from public, anon, service_role;
revoke all on function public.admin_save_site_settings_v2(jsonb, jsonb, text, text, boolean, text, text, jsonb, jsonb, text, boolean, integer, boolean) from public, anon, service_role;
grant execute on function public.admin_get_site_settings_v2() to authenticated;
grant execute on function public.admin_save_site_settings_v2(jsonb, jsonb, text, text, boolean, text, text, jsonb, jsonb, text, boolean, integer, boolean) to authenticated;

create table public.site_settings (
  id boolean primary key default true check (id),
  commissions_open boolean not null default true,
  home_heading jsonb not null default '{"th":"รับวาดภาพในโลกของคุณ","en":"Draw your world"}'::jsonb,
  home_description jsonb not null default '{"th":"คอมมิชชันและภาพประกอบโดย Nasora","en":"Commission and illustration by Nasora"}'::jsonb,
  business_hours text not null default '11:00 – 22:00',
  discord_contact text not null default 'nasora.studio',
  queue_capacity integer not null default 10 check (queue_capacity between 1 and 100),
  particles_enabled boolean not null default true,
  shooting_stars_enabled boolean not null default true,
  admin_note text not null default '',
  updated_at timestamptz not null default now(),
  constraint site_settings_home_heading_check check (
    jsonb_typeof(home_heading) = 'object'
    and nullif(btrim(home_heading ->> 'th'), '') is not null
    and nullif(btrim(home_heading ->> 'en'), '') is not null
    and home_heading - 'th' - 'en' = '{}'::jsonb
    and char_length(home_heading ->> 'th') <= 160
    and char_length(home_heading ->> 'en') <= 160
  ),
  constraint site_settings_home_description_check check (
    jsonb_typeof(home_description) = 'object'
    and nullif(btrim(home_description ->> 'th'), '') is not null
    and nullif(btrim(home_description ->> 'en'), '') is not null
    and home_description - 'th' - 'en' = '{}'::jsonb
    and char_length(home_description ->> 'th') <= 1000
    and char_length(home_description ->> 'en') <= 1000
  ),
  constraint site_settings_business_hours_check check (char_length(btrim(business_hours)) between 1 and 120),
  constraint site_settings_discord_contact_check check (char_length(btrim(discord_contact)) between 1 and 200),
  constraint site_settings_admin_note_check check (char_length(admin_note) <= 2000)
);

insert into public.site_settings (id) values (true);

alter table public.site_settings enable row level security;

create policy site_settings_public_read
on public.site_settings for select
to anon, authenticated
using (id = true);

revoke all on public.site_settings from public, anon, authenticated;
grant select (
  id,
  commissions_open,
  home_heading,
  home_description,
  business_hours,
  discord_contact,
  queue_capacity,
  particles_enabled,
  shooting_stars_enabled,
  updated_at
) on public.site_settings to anon, authenticated;
revoke insert, update, delete on public.site_settings from anon, authenticated;

create or replace function public.admin_get_site_settings()
returns table (
  admin_note text,
  business_hours text,
  commissions_open boolean,
  discord_contact text,
  home_description jsonb,
  home_heading jsonb,
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

  return query
  select
    settings.admin_note,
    settings.business_hours,
    settings.commissions_open,
    settings.discord_contact,
    settings.home_description,
    settings.home_heading,
    settings.particles_enabled,
    settings.queue_capacity,
    settings.shooting_stars_enabled,
    settings.updated_at
  from public.site_settings as settings
  where settings.id = true;
end;
$$;

create or replace function public.admin_save_site_settings(
  p_admin_note text,
  p_business_hours text,
  p_commissions_open boolean,
  p_discord_contact text,
  p_home_description jsonb,
  p_home_heading jsonb,
  p_particles_enabled boolean,
  p_queue_capacity integer,
  p_shooting_stars_enabled boolean
)
returns table (
  admin_note text,
  business_hours text,
  commissions_open boolean,
  discord_contact text,
  home_description jsonb,
  home_heading jsonb,
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

  update public.site_settings as settings
  set
    admin_note = btrim(coalesce(p_admin_note, '')),
    business_hours = btrim(p_business_hours),
    commissions_open = p_commissions_open,
    discord_contact = btrim(p_discord_contact),
    home_description = p_home_description,
    home_heading = p_home_heading,
    particles_enabled = p_particles_enabled,
    queue_capacity = p_queue_capacity,
    shooting_stars_enabled = p_shooting_stars_enabled,
    updated_at = now()
  where settings.id = true;

  insert into public.audit_logs (
    actor_user_id,
    actor_role,
    action,
    entity_type,
    before_state,
    after_state,
    reason
  )
  select
    (select auth.uid()),
    'admin',
    'update_site_settings',
    'site_settings',
    v_before - 'admin_note',
    to_jsonb(settings.*) - 'admin_note',
    'Updated from Admin settings'
  from public.site_settings as settings
  where settings.id = true;

  return query
  select
    settings.admin_note,
    settings.business_hours,
    settings.commissions_open,
    settings.discord_contact,
    settings.home_description,
    settings.home_heading,
    settings.particles_enabled,
    settings.queue_capacity,
    settings.shooting_stars_enabled,
    settings.updated_at
  from public.site_settings as settings
  where settings.id = true;
end;
$$;

create or replace function public.admin_set_commissions_open(p_commissions_open boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before boolean;
begin
  if not (select private.is_admin()) then
    raise exception 'admin_access_required';
  end if;

  select settings.commissions_open into v_before
  from public.site_settings as settings
  where settings.id = true
  for update;

  update public.site_settings as settings
  set commissions_open = p_commissions_open, updated_at = now()
  where settings.id = true;

  insert into public.audit_logs (
    actor_user_id,
    actor_role,
    action,
    entity_type,
    before_state,
    after_state,
    reason
  ) values (
    (select auth.uid()),
    'admin',
    'set_commissions_open',
    'site_settings',
    jsonb_build_object('commissions_open', v_before),
    jsonb_build_object('commissions_open', p_commissions_open),
    'Updated from Admin availability toggle'
  );

  return p_commissions_open;
end;
$$;

revoke all on function public.admin_get_site_settings() from public, anon, service_role;
revoke all on function public.admin_save_site_settings(text, text, boolean, text, jsonb, jsonb, boolean, integer, boolean) from public, anon, service_role;
revoke all on function public.admin_set_commissions_open(boolean) from public, anon, service_role;
grant execute on function public.admin_get_site_settings() to authenticated;
grant execute on function public.admin_save_site_settings(text, text, boolean, text, jsonb, jsonb, boolean, integer, boolean) to authenticated;
grant execute on function public.admin_set_commissions_open(boolean) to authenticated;

create or replace function private.enforce_commissions_open()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not coalesce((
    select settings.commissions_open
    from public.site_settings as settings
    where settings.id = true
  ), false) then
    raise exception 'commissions_closed';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_commissions_open() from public, anon, authenticated, service_role;

create trigger enforce_commissions_open_before_request
before insert on public.commission_requests
for each row execute function private.enforce_commissions_open();

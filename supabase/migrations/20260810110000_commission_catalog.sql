create table public.commission_catalog_media (
  id uuid primary key default gen_random_uuid(),
  object_key text not null unique,
  etag text not null,
  content_type text not null check (content_type in ('image/png', 'image/jpeg', 'image/webp')),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  alt jsonb not null default '{"th":"","en":""}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commission_catalog_media_alt_check check (
    jsonb_typeof(alt) = 'object'
    and alt ? 'th' and alt ? 'en'
    and jsonb_typeof(alt -> 'th') = 'string'
    and jsonb_typeof(alt -> 'en') = 'string'
  )
);

create table public.commission_albums (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  name jsonb not null,
  description jsonb not null default '{"th":"","en":""}'::jsonb,
  cover_media_id uuid references public.commission_catalog_media(id) on delete restrict,
  availability text not null default 'open' check (availability in ('open', 'limited', 'closed')),
  recommended boolean not null default false,
  published boolean not null default false,
  display_order integer not null default 0 check (display_order >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commission_albums_name_check check (
    jsonb_typeof(name) = 'object'
    and name ? 'th' and name ? 'en'
    and nullif(btrim(name ->> 'th'), '') is not null
    and nullif(btrim(name ->> 'en'), '') is not null
  ),
  constraint commission_albums_description_check check (
    jsonb_typeof(description) = 'object'
    and description ? 'th' and description ? 'en'
    and jsonb_typeof(description -> 'th') = 'string'
    and jsonb_typeof(description -> 'en') = 'string'
  )
);

create table public.commission_services (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.commission_albums(id) on delete restrict,
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  name jsonb not null,
  description jsonb not null default '{"th":"","en":""}'::jsonb,
  timing_guidance jsonb not null default '{"th":"","en":""}'::jsonb,
  cover_media_id uuid references public.commission_catalog_media(id) on delete restrict,
  availability text not null default 'open' check (availability in ('open', 'limited', 'closed')),
  free_revision_count integer not null default 4 check (free_revision_count >= 0 and free_revision_count <= 100),
  modifiers jsonb not null default '[]'::jsonb check (jsonb_typeof(modifiers) = 'array'),
  document_slugs text[] not null default '{}'::text[],
  published boolean not null default false,
  display_order integer not null default 0 check (display_order >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commission_services_album_slug_unique unique (album_id, slug),
  constraint commission_services_name_check check (
    jsonb_typeof(name) = 'object'
    and name ? 'th' and name ? 'en'
    and nullif(btrim(name ->> 'th'), '') is not null
    and nullif(btrim(name ->> 'en'), '') is not null
  ),
  constraint commission_services_description_check check (
    jsonb_typeof(description) = 'object'
    and description ? 'th' and description ? 'en'
  ),
  constraint commission_services_timing_check check (
    jsonb_typeof(timing_guidance) = 'object'
    and timing_guidance ? 'th' and timing_guidance ? 'en'
  )
);

create table public.commission_service_prices (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.commission_services(id) on delete restrict,
  usage text not null check (usage in ('personal', 'commercial')),
  pace text not null check (pace in ('normal', 'rush')),
  label jsonb not null,
  amount_satang bigint not null check (amount_satang >= 0 and amount_satang <= 2147483647),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commission_service_prices_variant_unique unique (service_id, usage, pace),
  constraint commission_service_prices_label_check check (
    jsonb_typeof(label) = 'object'
    and label ? 'th' and label ? 'en'
    and nullif(btrim(label ->> 'th'), '') is not null
    and nullif(btrim(label ->> 'en'), '') is not null
  )
);

create index commission_albums_public_order_idx
  on public.commission_albums (display_order, created_at)
  where published = true and archived_at is null;
create index commission_services_album_order_idx
  on public.commission_services (album_id, display_order, created_at)
  where archived_at is null;
create index commission_service_prices_service_order_idx
  on public.commission_service_prices (service_id, display_order);
create index commission_catalog_media_created_by_idx
  on public.commission_catalog_media (created_by, created_at desc);

alter table public.commission_catalog_media enable row level security;
alter table public.commission_albums enable row level security;
alter table public.commission_services enable row level security;
alter table public.commission_service_prices enable row level security;

create policy commission_albums_public_select
on public.commission_albums for select to anon, authenticated
using (published = true and archived_at is null);

create policy commission_albums_admin_select
on public.commission_albums for select to authenticated
using ((select private.is_admin()));

create policy commission_services_public_select
on public.commission_services for select to anon, authenticated
using (
  published = true and archived_at is null
  and exists (
    select 1 from public.commission_albums album
    where album.id = commission_services.album_id
      and album.published = true and album.archived_at is null
  )
);

create policy commission_services_admin_select
on public.commission_services for select to authenticated
using ((select private.is_admin()));

create policy commission_service_prices_public_select
on public.commission_service_prices for select to anon, authenticated
using (
  exists (
    select 1
    from public.commission_services service
    join public.commission_albums album on album.id = service.album_id
    where service.id = commission_service_prices.service_id
      and service.published = true and service.archived_at is null
      and album.published = true and album.archived_at is null
  )
);

create policy commission_service_prices_admin_select
on public.commission_service_prices for select to authenticated
using ((select private.is_admin()));

create policy commission_catalog_media_public_select
on public.commission_catalog_media for select to anon, authenticated
using (
  archived_at is null and (
    exists (
      select 1 from public.commission_albums album
      where album.cover_media_id = commission_catalog_media.id
        and album.published = true and album.archived_at is null
    )
    or exists (
      select 1
      from public.commission_services service
      join public.commission_albums album on album.id = service.album_id
      where service.cover_media_id = commission_catalog_media.id
        and service.published = true and service.archived_at is null
        and album.published = true and album.archived_at is null
    )
  )
);

create policy commission_catalog_media_admin_select
on public.commission_catalog_media for select to authenticated
using ((select private.is_admin()));

grant select on public.commission_albums, public.commission_services,
  public.commission_service_prices, public.commission_catalog_media
to anon, authenticated;

revoke insert, update, delete on public.commission_albums,
  public.commission_services, public.commission_service_prices,
  public.commission_catalog_media
from anon, authenticated;

create or replace function public.admin_save_commission_album(
  p_album_id uuid,
  p_slug text,
  p_name jsonb,
  p_description jsonb,
  p_cover_media_id uuid,
  p_availability text,
  p_recommended boolean,
  p_published boolean,
  p_display_order integer
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_before jsonb;
  v_after jsonb;
begin
  if not (select private.is_admin()) then raise exception 'admin_access_required'; end if;
  if p_album_id is null then
    insert into public.commission_albums
      (slug, name, description, cover_media_id, availability, recommended, published, display_order)
    values
      (p_slug, p_name, p_description, p_cover_media_id, p_availability, p_recommended, p_published, p_display_order)
    returning id, to_jsonb(commission_albums.*) into v_id, v_after;
  else
    select to_jsonb(album.*) into v_before
    from public.commission_albums album where album.id = p_album_id for update;
    if not found then raise exception 'catalog_album_not_found'; end if;
    update public.commission_albums
    set slug = p_slug, name = p_name, description = p_description,
        cover_media_id = p_cover_media_id, availability = p_availability,
        recommended = p_recommended, published = p_published,
        display_order = p_display_order, updated_at = now()
    where id = p_album_id
    returning id, to_jsonb(commission_albums.*) into v_id, v_after;
  end if;
  insert into public.audit_logs
    (actor_user_id, actor_role, action, entity_type, entity_id, before_state, after_state)
  values
    ((select auth.uid()), 'admin', case when p_album_id is null then 'create_catalog_album' else 'update_catalog_album' end,
     'commission_album', v_id, v_before, v_after);
  return v_id;
end;
$$;

create or replace function public.admin_set_commission_album_archive(
  p_album_id uuid,
  p_archived boolean,
  p_reason text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_before jsonb;
  v_after jsonb;
begin
  if not (select private.is_admin()) then raise exception 'admin_access_required'; end if;
  select to_jsonb(album.*) into v_before
  from public.commission_albums album where album.id = p_album_id for update;
  if not found then raise exception 'catalog_album_not_found'; end if;
  update public.commission_albums
  set archived_at = case when p_archived then coalesce(archived_at, now()) else null end,
      published = case when p_archived then false else published end,
      updated_at = now()
  where id = p_album_id
  returning to_jsonb(commission_albums.*) into v_after;
  insert into public.audit_logs
    (actor_user_id, actor_role, action, entity_type, entity_id, before_state, after_state, reason)
  values
    ((select auth.uid()), 'admin', case when p_archived then 'archive_catalog_album' else 'restore_catalog_album' end,
     'commission_album', p_album_id, v_before, v_after, p_reason);
end;
$$;

create or replace function public.admin_save_commission_service(
  p_service_id uuid,
  p_album_id uuid,
  p_slug text,
  p_name jsonb,
  p_description jsonb,
  p_timing_guidance jsonb,
  p_cover_media_id uuid,
  p_availability text,
  p_free_revision_count integer,
  p_modifiers jsonb,
  p_document_slugs text[],
  p_published boolean,
  p_display_order integer
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_before jsonb;
  v_after jsonb;
begin
  if not (select private.is_admin()) then raise exception 'admin_access_required'; end if;
  perform 1 from public.commission_albums where id = p_album_id and archived_at is null;
  if not found then raise exception 'catalog_album_not_found'; end if;
  if p_service_id is null then
    insert into public.commission_services
      (album_id, slug, name, description, timing_guidance, cover_media_id, availability,
       free_revision_count, modifiers, document_slugs, published, display_order)
    values
      (p_album_id, p_slug, p_name, p_description, p_timing_guidance, p_cover_media_id, p_availability,
       p_free_revision_count, coalesce(p_modifiers, '[]'::jsonb), coalesce(p_document_slugs, '{}'::text[]), p_published, p_display_order)
    returning id, to_jsonb(commission_services.*) into v_id, v_after;
  else
    select to_jsonb(service.*) into v_before
    from public.commission_services service where service.id = p_service_id for update;
    if not found then raise exception 'catalog_service_not_found'; end if;
    update public.commission_services
    set album_id = p_album_id, slug = p_slug, name = p_name, description = p_description,
        timing_guidance = p_timing_guidance, cover_media_id = p_cover_media_id,
        availability = p_availability, free_revision_count = p_free_revision_count,
        modifiers = coalesce(p_modifiers, '[]'::jsonb), document_slugs = coalesce(p_document_slugs, '{}'::text[]),
        published = p_published, display_order = p_display_order, updated_at = now()
    where id = p_service_id
    returning id, to_jsonb(commission_services.*) into v_id, v_after;
  end if;
  insert into public.audit_logs
    (actor_user_id, actor_role, action, entity_type, entity_id, before_state, after_state)
  values
    ((select auth.uid()), 'admin', case when p_service_id is null then 'create_catalog_service' else 'update_catalog_service' end,
     'commission_service', v_id, v_before, v_after);
  return v_id;
end;
$$;

create or replace function public.admin_set_commission_service_archive(
  p_service_id uuid,
  p_archived boolean,
  p_reason text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_before jsonb;
  v_after jsonb;
begin
  if not (select private.is_admin()) then raise exception 'admin_access_required'; end if;
  select to_jsonb(service.*) into v_before
  from public.commission_services service where service.id = p_service_id for update;
  if not found then raise exception 'catalog_service_not_found'; end if;
  update public.commission_services
  set archived_at = case when p_archived then coalesce(archived_at, now()) else null end,
      published = case when p_archived then false else published end,
      updated_at = now()
  where id = p_service_id
  returning to_jsonb(commission_services.*) into v_after;
  insert into public.audit_logs
    (actor_user_id, actor_role, action, entity_type, entity_id, before_state, after_state, reason)
  values
    ((select auth.uid()), 'admin', case when p_archived then 'archive_catalog_service' else 'restore_catalog_service' end,
     'commission_service', p_service_id, v_before, v_after, p_reason);
end;
$$;

create or replace function public.admin_replace_commission_service_prices(
  p_service_id uuid,
  p_prices jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_before jsonb;
  v_after jsonb;
begin
  if not (select private.is_admin()) then raise exception 'admin_access_required'; end if;
  perform 1 from public.commission_services where id = p_service_id for update;
  if not found then raise exception 'catalog_service_not_found'; end if;
  if jsonb_typeof(p_prices) <> 'array' or jsonb_array_length(p_prices) > 4 then
    raise exception 'invalid_catalog_prices';
  end if;
  select coalesce(jsonb_agg(to_jsonb(price.*) order by price.display_order), '[]'::jsonb)
  into v_before from public.commission_service_prices price where price.service_id = p_service_id;
  delete from public.commission_service_prices where service_id = p_service_id;
  insert into public.commission_service_prices
    (service_id, usage, pace, label, amount_satang, display_order)
  select p_service_id, item.usage, item.pace, item.label, item.amount_satang, item.display_order
  from jsonb_to_recordset(p_prices) as item(
    usage text, pace text, label jsonb, amount_satang bigint, display_order integer
  );
  select coalesce(jsonb_agg(to_jsonb(price.*) order by price.display_order), '[]'::jsonb)
  into v_after from public.commission_service_prices price where price.service_id = p_service_id;
  insert into public.audit_logs
    (actor_user_id, actor_role, action, entity_type, entity_id, before_state, after_state)
  values ((select auth.uid()), 'admin', 'replace_catalog_service_prices', 'commission_service', p_service_id, v_before, v_after);
end;
$$;

revoke all on function public.admin_save_commission_album(uuid, text, jsonb, jsonb, uuid, text, boolean, boolean, integer) from public;
revoke all on function public.admin_set_commission_album_archive(uuid, boolean, text) from public;
revoke all on function public.admin_save_commission_service(uuid, uuid, text, jsonb, jsonb, jsonb, uuid, text, integer, jsonb, text[], boolean, integer) from public;
revoke all on function public.admin_set_commission_service_archive(uuid, boolean, text) from public;
revoke all on function public.admin_replace_commission_service_prices(uuid, jsonb) from public;

grant execute on function public.admin_save_commission_album(uuid, text, jsonb, jsonb, uuid, text, boolean, boolean, integer) to authenticated;
grant execute on function public.admin_set_commission_album_archive(uuid, boolean, text) to authenticated;
grant execute on function public.admin_save_commission_service(uuid, uuid, text, jsonb, jsonb, jsonb, uuid, text, integer, jsonb, text[], boolean, integer) to authenticated;
grant execute on function public.admin_set_commission_service_archive(uuid, boolean, text) to authenticated;
grant execute on function public.admin_replace_commission_service_prices(uuid, jsonb) to authenticated;

insert into public.commission_albums
  (slug, name, description, availability, recommended, published, display_order)
values
  ('chibi', '{"th":"Chibi","en":"Chibi"}', '{"th":"ตัวละครน่ารักขนาดกะทัดรัด","en":"Compact and expressive chibi characters."}', 'open', true, true, 1),
  ('illustration', '{"th":"Illustration","en":"Illustration"}', '{"th":"ภาพประกอบตามรายละเอียดและบรรยากาศที่ต้องการ","en":"Detailed illustrations shaped around your desired mood."}', 'open', true, true, 2),
  ('vtuber', '{"th":"VTuber","en":"VTuber"}', '{"th":"งานออกแบบและภาพอ้างอิงสำหรับ VTuber","en":"Design and reference artwork for VTubers."}', 'limited', false, true, 3),
  ('minecraft-skin', '{"th":"Skin Minecraft","en":"Minecraft Skin"}', '{"th":"สกิน Minecraft ออกแบบเฉพาะตัว","en":"Custom-designed Minecraft skins."}', 'open', false, true, 4)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    availability = excluded.availability,
    recommended = excluded.recommended,
    display_order = excluded.display_order,
    updated_at = now();

with service_seed(album_slug, slug, name, description, timing_guidance, availability, display_order) as (
  values
    ('chibi', 'chibi-bust', '{"th":"Chibi Bust","en":"Chibi Bust"}'::jsonb, '{"th":"ตัวละครชิบิครึ่งตัว","en":"Half-body chibi character."}'::jsonb, '{"th":"ประมาณ 5–10 วัน","en":"About 5–10 days"}'::jsonb, 'open', 1),
    ('chibi', 'chibi-full-body', '{"th":"Chibi Full Body","en":"Chibi Full Body"}'::jsonb, '{"th":"ตัวละครชิบิเต็มตัว","en":"Full-body chibi character."}'::jsonb, '{"th":"ประมาณ 7–14 วัน","en":"About 7–14 days"}'::jsonb, 'open', 2),
    ('illustration', 'illustration-half-body', '{"th":"Half Body","en":"Half Body"}'::jsonb, '{"th":"ภาพประกอบตัวละครครึ่งตัว","en":"Half-body character illustration."}'::jsonb, '{"th":"ประมาณ 2–3 สัปดาห์","en":"About 2–3 weeks"}'::jsonb, 'open', 1),
    ('illustration', 'illustration-full-scene', '{"th":"Full Scene","en":"Full Scene"}'::jsonb, '{"th":"ภาพประกอบฉากเต็ม","en":"Full narrative scene."}'::jsonb, '{"th":"ประมาณ 3–5 สัปดาห์","en":"About 3–5 weeks"}'::jsonb, 'limited', 2),
    ('vtuber', 'vtuber-reference', '{"th":"VTuber Reference","en":"VTuber Reference"}'::jsonb, '{"th":"ภาพอ้างอิงคาแรกเตอร์","en":"Character reference sheet."}'::jsonb, '{"th":"ประมาณ 3–4 สัปดาห์","en":"About 3–4 weeks"}'::jsonb, 'limited', 1),
    ('minecraft-skin', 'minecraft-skin-custom', '{"th":"Custom Skin","en":"Custom Skin"}'::jsonb, '{"th":"สกิน Minecraft แบบกำหนดเอง","en":"A custom Minecraft skin."}'::jsonb, '{"th":"ประมาณ 3–5 วัน","en":"About 3–5 days"}'::jsonb, 'open', 1)
)
insert into public.commission_services
  (album_id, slug, name, description, timing_guidance, availability, published, display_order, document_slugs)
select album.id, seed.slug, seed.name, seed.description, seed.timing_guidance,
       seed.availability, true, seed.display_order, array['commission-terms']::text[]
from service_seed seed
join public.commission_albums album on album.slug = seed.album_slug
on conflict (album_id, slug) do update
set name = excluded.name,
    description = excluded.description,
    timing_guidance = excluded.timing_guidance,
    availability = excluded.availability,
    display_order = excluded.display_order,
    updated_at = now();

with price_seed(service_slug, usage, pace, label, amount_satang, display_order) as (
  values
    ('chibi-bust', 'personal', 'normal', '{"th":"ส่วนตัว ปกติ","en":"Personal Normal"}'::jsonb, 90000::bigint, 1),
    ('chibi-bust', 'commercial', 'normal', '{"th":"เชิงพาณิชย์ ปกติ","en":"Commercial Normal"}'::jsonb, 180000::bigint, 2),
    ('chibi-full-body', 'personal', 'normal', '{"th":"ส่วนตัว ปกติ","en":"Personal Normal"}'::jsonb, 140000::bigint, 1),
    ('chibi-full-body', 'commercial', 'normal', '{"th":"เชิงพาณิชย์ ปกติ","en":"Commercial Normal"}'::jsonb, 280000::bigint, 2),
    ('illustration-half-body', 'personal', 'normal', '{"th":"ส่วนตัว ปกติ","en":"Personal Normal"}'::jsonb, 220000::bigint, 1),
    ('illustration-half-body', 'commercial', 'normal', '{"th":"เชิงพาณิชย์ ปกติ","en":"Commercial Normal"}'::jsonb, 440000::bigint, 2),
    ('illustration-full-scene', 'personal', 'normal', '{"th":"ส่วนตัว ปกติ","en":"Personal Normal"}'::jsonb, 450000::bigint, 1),
    ('illustration-full-scene', 'commercial', 'normal', '{"th":"เชิงพาณิชย์ ปกติ","en":"Commercial Normal"}'::jsonb, 900000::bigint, 2),
    ('vtuber-reference', 'personal', 'normal', '{"th":"ส่วนตัว ปกติ","en":"Personal Normal"}'::jsonb, 600000::bigint, 1),
    ('minecraft-skin-custom', 'personal', 'normal', '{"th":"ส่วนตัว ปกติ","en":"Personal Normal"}'::jsonb, 65000::bigint, 1)
)
insert into public.commission_service_prices
  (service_id, usage, pace, label, amount_satang, display_order)
select service.id, seed.usage, seed.pace, seed.label, seed.amount_satang, seed.display_order
from price_seed seed
join public.commission_services service on service.slug = seed.service_slug
on conflict (service_id, usage, pace) do update
set label = excluded.label,
    amount_satang = excluded.amount_satang,
    display_order = excluded.display_order,
    updated_at = now();

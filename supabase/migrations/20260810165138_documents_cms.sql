create table public.public_documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null constraint public_documents_category_check check (category in ('terms', 'guide', 'privacy')),
  title jsonb not null default '{"th":"","en":""}'::jsonb,
  summary jsonb not null default '{"th":"","en":""}'::jsonb,
  content jsonb not null default '{"th":{"type":"root","children":[]},"en":{"type":"root","children":[]}}'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  cover_media_id uuid references public.commission_catalog_media(id) on delete restrict,
  pinned boolean not null default false,
  display_order integer not null default 0 check (display_order >= 0),
  published boolean not null default false,
  archived_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_documents_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint public_documents_title_check check (jsonb_typeof(title) = 'object'),
  constraint public_documents_summary_check check (jsonb_typeof(summary) = 'object'),
  constraint public_documents_content_check check (jsonb_typeof(content) = 'object'),
  constraint public_documents_tags_check check (jsonb_typeof(tags) = 'array' and jsonb_array_length(tags) <= 30)
);

create index public_documents_public_order_idx
  on public.public_documents (pinned desc, display_order, updated_at desc, id)
  where published = true and archived_at is null;
create index public_documents_category_idx
  on public.public_documents (category, display_order)
  where archived_at is null;
create index public_documents_cover_media_idx
  on public.public_documents (cover_media_id)
  where cover_media_id is not null;

alter table public.public_documents enable row level security;

create policy public_documents_public_select
on public.public_documents for select to anon, authenticated
using (published = true and archived_at is null);

create policy public_documents_admin_select
on public.public_documents for select to authenticated
using ((select private.is_admin()));

grant select on public.public_documents to anon, authenticated;
revoke insert, update, delete on public.public_documents from anon, authenticated, service_role;

drop policy commission_catalog_media_public_select on public.commission_catalog_media;
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
    or exists (
      select 1
      from public.portfolio_items item
      join public.commission_albums album on album.id = item.album_id
      where item.media_id = commission_catalog_media.id
        and item.published = true and item.archived_at is null
        and album.published = true and album.archived_at is null
    )
    or exists (
      select 1 from public.public_documents document
      where document.cover_media_id = commission_catalog_media.id
        and document.published = true and document.archived_at is null
    )
  )
);

create or replace function public.admin_save_public_document(
  p_document_id uuid,
  p_slug text,
  p_category text,
  p_title jsonb,
  p_summary jsonb,
  p_content jsonb,
  p_tags jsonb,
  p_cover_media_id uuid,
  p_pinned boolean,
  p_display_order integer,
  p_published boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_id uuid;
  v_before jsonb;
  v_after jsonb;
begin
  if not (select private.is_admin()) then raise exception 'admin_access_required'; end if;
  if p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or length(p_slug) > 120 then raise exception 'invalid_document_slug'; end if;
  if p_category not in ('terms', 'guide', 'privacy') then raise exception 'invalid_document_category'; end if;
  if p_display_order < 0 or p_display_order > 100000 then raise exception 'invalid_document_order'; end if;
  if jsonb_typeof(p_title) <> 'object' or jsonb_typeof(p_summary) <> 'object'
    or jsonb_typeof(p_content) <> 'object' or jsonb_typeof(p_tags) <> 'array'
    or jsonb_array_length(p_tags) > 30
  then raise exception 'invalid_document_shape'; end if;
  if octet_length(p_title::text) > 4000 or octet_length(p_summary::text) > 12000
    or octet_length(p_content::text) > 500000 or octet_length(p_tags::text) > 12000
  then raise exception 'document_payload_too_large'; end if;
  if p_cover_media_id is not null and not exists (
    select 1 from public.commission_catalog_media media
    where media.id = p_cover_media_id and media.archived_at is null
      and media.object_key ~ '^document-covers/[0-9a-f-]{36}\.(png|jpg|webp)$'
  ) then raise exception 'document_cover_not_found'; end if;

  if p_published and (
    nullif(btrim(p_title ->> 'th'), '') is null
    or nullif(btrim(p_title ->> 'en'), '') is null
    or nullif(btrim(p_summary ->> 'th'), '') is null
    or nullif(btrim(p_summary ->> 'en'), '') is null
    or jsonb_typeof(p_content -> 'th') <> 'object'
    or jsonb_typeof(p_content -> 'en') <> 'object'
    or p_content -> 'th' ->> 'type' <> 'root'
    or p_content -> 'en' ->> 'type' <> 'root'
    or jsonb_typeof(p_content -> 'th' -> 'children') <> 'array'
    or jsonb_typeof(p_content -> 'en' -> 'children') <> 'array'
    or jsonb_array_length(p_content -> 'th' -> 'children') = 0
    or jsonb_array_length(p_content -> 'en' -> 'children') = 0
  ) then raise exception 'invalid_document_publish_content'; end if;

  if p_document_id is null then
    insert into public.public_documents
      (slug, category, title, summary, content, tags, cover_media_id, pinned, display_order, published, created_by, updated_by)
    values
      (p_slug, p_category, p_title, p_summary, p_content, p_tags, p_cover_media_id, p_pinned, p_display_order, p_published, v_actor, v_actor)
    returning id, to_jsonb(public_documents.*) into v_id, v_after;
  else
    select to_jsonb(document.*) into v_before
    from public.public_documents document where document.id = p_document_id for update;
    if not found then raise exception 'document_not_found'; end if;

    update public.public_documents
    set slug = p_slug, category = p_category, title = p_title, summary = p_summary,
        content = p_content, tags = p_tags, cover_media_id = p_cover_media_id,
        pinned = p_pinned, display_order = p_display_order, published = p_published,
        updated_by = v_actor, updated_at = now()
    where id = p_document_id
    returning id, to_jsonb(public_documents.*) into v_id, v_after;
  end if;

  insert into public.audit_logs
    (actor_user_id, actor_role, action, entity_type, entity_id, before_state, after_state)
  values
    (v_actor, 'admin', case when p_document_id is null then 'create_public_document' else 'update_public_document' end,
      'public_document', v_id, v_before, v_after);
  return v_id;
exception when unique_violation then
  raise exception 'document_slug_conflict' using errcode = '23505';
end;
$$;

create or replace function public.admin_set_public_document_archive(
  p_document_id uuid,
  p_archived boolean,
  p_reason text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_before jsonb;
  v_after jsonb;
begin
  if not (select private.is_admin()) then raise exception 'admin_access_required'; end if;
  select to_jsonb(document.*) into v_before
  from public.public_documents document where document.id = p_document_id for update;
  if not found then raise exception 'document_not_found'; end if;

  update public.public_documents
  set archived_at = case when p_archived then coalesce(archived_at, now()) else null end,
      published = case when p_archived then false else published end,
      updated_by = v_actor, updated_at = now()
  where id = p_document_id returning to_jsonb(public_documents.*) into v_after;

  insert into public.audit_logs
    (actor_user_id, actor_role, action, entity_type, entity_id, before_state, after_state, reason)
  values
    (v_actor, 'admin', case when p_archived then 'archive_public_document' else 'restore_public_document' end,
      'public_document', p_document_id, v_before, v_after, nullif(btrim(p_reason), ''));
end;
$$;

create or replace function public.admin_create_document_media(
  p_object_key text,
  p_etag text,
  p_content_type text,
  p_width integer,
  p_height integer,
  p_alt jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_after jsonb;
begin
  if not (select private.is_admin()) then raise exception 'admin_access_required'; end if;
  if p_object_key !~ '^document-covers/[0-9a-f-]{36}\.(png|jpg|webp)$' then raise exception 'invalid_document_media_key'; end if;
  if p_width < 1 or p_width > 20000 or p_height < 1 or p_height > 20000 then raise exception 'invalid_document_media_size'; end if;
  if p_content_type not in ('image/png', 'image/jpeg', 'image/webp') then raise exception 'invalid_document_media_type'; end if;
  if jsonb_typeof(p_alt) <> 'object' then raise exception 'invalid_document_media_alt'; end if;

  insert into public.commission_catalog_media (object_key, etag, content_type, width, height, alt, created_by)
  values (p_object_key, p_etag, p_content_type, p_width, p_height, p_alt, (select auth.uid()))
  returning id, to_jsonb(commission_catalog_media.*) into v_id, v_after;

  insert into public.audit_logs (actor_user_id, actor_role, action, entity_type, entity_id, after_state)
  values ((select auth.uid()), 'admin', 'create_document_media', 'commission_catalog_media', v_id, v_after);
  return v_id;
end;
$$;

revoke all on function public.admin_save_public_document(uuid, text, text, jsonb, jsonb, jsonb, jsonb, uuid, boolean, integer, boolean) from public;
revoke all on function public.admin_set_public_document_archive(uuid, boolean, text) from public;
revoke all on function public.admin_create_document_media(text, text, text, integer, integer, jsonb) from public;
revoke execute on function public.admin_save_public_document(uuid, text, text, jsonb, jsonb, jsonb, jsonb, uuid, boolean, integer, boolean) from anon, service_role;
revoke execute on function public.admin_set_public_document_archive(uuid, boolean, text) from anon, service_role;
revoke execute on function public.admin_create_document_media(text, text, text, integer, integer, jsonb) from anon, service_role;
grant execute on function public.admin_save_public_document(uuid, text, text, jsonb, jsonb, jsonb, jsonb, uuid, boolean, integer, boolean) to authenticated;
grant execute on function public.admin_set_public_document_archive(uuid, boolean, text) to authenticated;
grant execute on function public.admin_create_document_media(text, text, text, integer, integer, jsonb) to authenticated;

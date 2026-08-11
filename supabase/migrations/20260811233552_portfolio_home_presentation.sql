+alter table public.portfolio_items
  add column show_in_hero boolean not null default false;

create index portfolio_items_public_home_idx
  on public.portfolio_items (featured desc, show_in_hero desc, display_order, id)
  where published = true and archived_at is null;

revoke execute on function public.admin_save_portfolio_item(uuid, uuid, uuid, jsonb, boolean, integer, boolean)
  from authenticated;
drop function public.admin_save_portfolio_item(uuid, uuid, uuid, jsonb, boolean, integer, boolean);

create function public.admin_save_portfolio_item(
  p_item_id uuid,
  p_album_id uuid,
  p_media_id uuid,
  p_title jsonb,
  p_featured boolean,
  p_show_in_hero boolean,
  p_display_order integer,
  p_published boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_album_published boolean;
  v_id uuid;
  v_before jsonb;
  v_after jsonb;
begin
  if not (select private.is_admin()) then raise exception 'admin_access_required'; end if;
  if p_display_order < 0 then raise exception 'invalid_portfolio_order'; end if;
  if jsonb_typeof(p_title) <> 'object'
    or nullif(btrim(p_title ->> 'th'), '') is null
    or nullif(btrim(p_title ->> 'en'), '') is null
  then raise exception 'invalid_portfolio_title'; end if;

  select album.published into v_album_published
  from public.commission_albums album
  where album.id = p_album_id and album.archived_at is null;
  if not found then raise exception 'portfolio_album_not_found'; end if;
  if p_published and not v_album_published then raise exception 'portfolio_album_not_published'; end if;
  if not exists (
    select 1 from public.commission_catalog_media media
    where media.id = p_media_id and media.archived_at is null
  ) then raise exception 'portfolio_media_not_found'; end if;

  if p_item_id is null then
    insert into public.portfolio_items
      (album_id, media_id, title, featured, show_in_hero, display_order, published, created_by, updated_by)
    values
      (p_album_id, p_media_id, p_title, p_featured, p_show_in_hero, p_display_order, p_published, v_actor, v_actor)
    returning id, to_jsonb(portfolio_items.*) into v_id, v_after;
  else
    select to_jsonb(item.*) into v_before
    from public.portfolio_items item
    where item.id = p_item_id
    for update;
    if not found then raise exception 'portfolio_item_not_found'; end if;

    update public.portfolio_items
    set album_id = p_album_id,
        media_id = p_media_id,
        title = p_title,
        featured = p_featured,
        show_in_hero = p_show_in_hero,
        display_order = p_display_order,
        published = p_published,
        updated_by = v_actor,
        updated_at = now()
    where id = p_item_id
    returning id, to_jsonb(portfolio_items.*) into v_id, v_after;
  end if;

  insert into public.audit_logs
    (actor_user_id, actor_role, action, entity_type, entity_id, before_state, after_state)
  values
    (v_actor, 'admin',
      case when p_item_id is null then 'create_portfolio_item' else 'update_portfolio_item' end,
      'portfolio_item', v_id, v_before, v_after);
  return v_id;
end;
$$;

revoke all on function public.admin_save_portfolio_item(uuid, uuid, uuid, jsonb, boolean, boolean, integer, boolean)
  from public;
revoke execute on function public.admin_save_portfolio_item(uuid, uuid, uuid, jsonb, boolean, boolean, integer, boolean)
  from anon, service_role;
grant execute on function public.admin_save_portfolio_item(uuid, uuid, uuid, jsonb, boolean, boolean, integer, boolean)
  to authenticated;

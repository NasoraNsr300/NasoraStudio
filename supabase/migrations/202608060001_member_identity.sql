create extension if not exists pgcrypto;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 60),
  preferred_locale text not null default 'th' check (preferred_locale in ('th', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contact_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (char_length(kind) between 1 and 40),
  value text not null check (char_length(value) between 1 and 200),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index contact_channels_one_default_per_user
  on public.contact_channels(user_id) where is_default;

create function public.create_member_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(user_id, nickname, preferred_locale)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nickname', ''), split_part(new.email, '@', 1), 'Member'),
    case when new.raw_user_meta_data ->> 'preferred_locale' = 'en' then 'en' else 'th' end
  );
  return new;
end;
$$;

create trigger create_member_profile_after_signup
after insert on auth.users for each row execute function public.create_member_profile();

create function public.set_default_contact_channel(contact_id uuid) returns void
language plpgsql set search_path = '' as $$
begin
  update public.contact_channels set is_default = false, updated_at = now()
  where user_id = auth.uid();

  update public.contact_channels set is_default = true, updated_at = now()
  where id = contact_id and user_id = auth.uid();

  if not found then
    raise exception 'contact_not_found';
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.contact_channels enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);
create policy profiles_update_own on public.profiles for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy contacts_select_own on public.contact_channels for select to authenticated
using ((select auth.uid()) = user_id);
create policy contacts_insert_own on public.contact_channels for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy contacts_update_own on public.contact_channels for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy contacts_delete_own on public.contact_channels for delete to authenticated
using ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.contact_channels to authenticated;

revoke all on function public.create_member_profile() from public, anon, authenticated;
revoke all on function public.set_default_contact_channel(uuid) from public, anon;
grant execute on function public.set_default_contact_channel(uuid) to authenticated;

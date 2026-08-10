-- Member job collaboration, delivery retention, and in-site notifications.
-- Guest communication remains external and Guest jobs never receive a conversation.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete restrict,
  member_user_id uuid not null references auth.users(id) on delete restrict,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete restrict,
  sender_user_id uuid references auth.users(id) on delete restrict,
  sender_role text not null check (sender_role in ('member', 'admin', 'system')),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  constraint messages_system_sender_check check (
    (sender_role = 'system' and is_system and sender_user_id is null)
    or (sender_role in ('member', 'admin') and not is_system and sender_user_id is not null)
  )
);

create table public.message_assets (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete restrict,
  object_key text not null unique check (object_key ~ '^message-images/[0-9a-f-]+\.(png|jpg|webp)$'),
  content_type text not null check (content_type in ('image/png', 'image/jpeg', 'image/webp')),
  size_bytes bigint not null check (size_bytes between 1 and 5242880),
  etag text not null check (char_length(btrim(etag)) > 0),
  delete_after timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  last_read_message_id uuid references public.messages(id) on delete restrict,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.job_progress_updates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  image_object_key text unique check (image_object_key is null or image_object_key ~ '^progress-images/[0-9a-f-]+\.(png|jpg|webp)$'),
  image_content_type text check (image_content_type is null or image_content_type in ('image/png', 'image/jpeg', 'image/webp')),
  image_size_bytes bigint check (image_size_bytes is null or image_size_bytes between 1 and 5242880),
  image_etag text,
  image_delete_after timestamptz,
  created_at timestamptz not null default now(),
  constraint progress_image_complete check (
    (image_object_key is null and image_content_type is null and image_size_bytes is null and image_etag is null)
    or (image_object_key is not null and image_content_type is not null and image_size_bytes is not null and nullif(btrim(image_etag), '') is not null)
  )
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete restrict,
  type text not null check (type in ('quote', 'payment', 'status', 'message', 'progress', 'delivery')),
  title jsonb not null,
  body jsonb not null,
  target_url text not null check (target_url like '/%'),
  entity_type text not null,
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  archived_at timestamptz
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete restrict,
  kind text not null check (kind in ('r2_file', 'google_drive')),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 240),
  object_key text unique check (object_key is null or object_key ~ '^deliveries/[0-9a-f-]+/[^/]+$'),
  content_type text,
  size_bytes bigint check (size_bytes is null or size_bytes between 1 and 26214400),
  etag text,
  external_url text check (external_url is null or external_url ~ '^https://drive\.google\.com/'),
  delivered_by uuid not null references auth.users(id) on delete restrict,
  delivered_at timestamptz not null default now(),
  expires_at timestamptz not null,
  hidden_at timestamptz,
  deleted_at timestamptz,
  admin_override boolean not null default false,
  admin_note text,
  created_at timestamptz not null default now(),
  constraint delivery_payload_check check (
    (kind = 'google_drive' and external_url is not null and object_key is null and content_type is null and size_bytes is null and etag is null)
    or (kind = 'r2_file' and external_url is null and object_key is not null and content_type is not null and size_bytes is not null and nullif(btrim(etag), '') is not null)
  )
);

create table private.cleanup_tasks (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('delivery', 'message_asset', 'progress_image')),
  target_id uuid not null,
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'complete', 'failed')),
  attempts integer not null default 0 check (attempts between 0 and 5),
  last_error text,
  created_at timestamptz not null default now(),
  unique (target_type, target_id)
);

create index messages_conversation_created_idx on public.messages (conversation_id, created_at, id);
create index progress_job_created_idx on public.job_progress_updates (job_id, created_at desc);
create index notifications_recipient_unread_idx on public.notifications (recipient_user_id, created_at desc) where read_at is null and archived_at is null;
create index deliveries_job_created_idx on public.deliveries (job_id, delivered_at desc);
create index deliveries_expiry_idx on public.deliveries (expires_at) where hidden_at is null;
create index conversations_member_updated_idx on public.conversations (member_user_id, updated_at desc);

create function private.set_delivery_expiry() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.expires_at := new.delivered_at + interval '30 days';
  return new;
end; $$;
create trigger deliveries_set_expiry before insert on public.deliveries for each row execute function private.set_delivery_expiry();

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_assets enable row level security;
alter table public.conversation_reads enable row level security;
alter table public.job_progress_updates enable row level security;
alter table public.notifications enable row level security;
alter table public.deliveries enable row level security;

create function private.job_is_fully_paid(p_job_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.jobs job
    where job.id = p_job_id
      and (select coalesce(sum(payment.amount_satang), 0) from public.payments payment where payment.quote_id = job.accepted_quote_id) >= job.current_total_satang
  )
$$;

create policy conversations_select_owner on public.conversations for select to authenticated
using ((select private.is_admin()) or member_user_id = (select auth.uid()));
create policy messages_select_owner on public.messages for select to authenticated
using (exists (select 1 from public.conversations conversation where conversation.id = conversation_id and ((select private.is_admin()) or conversation.member_user_id = (select auth.uid()))));
create policy message_assets_select_owner on public.message_assets for select to authenticated
using (deleted_at is null and exists (select 1 from public.messages message join public.conversations conversation on conversation.id = message.conversation_id where message.id = message_id and ((select private.is_admin()) or conversation.member_user_id = (select auth.uid()))));
create policy conversation_reads_select_owner on public.conversation_reads for select to authenticated
using ((select private.is_admin()) or user_id = (select auth.uid()));
create policy progress_select_owner on public.job_progress_updates for select to authenticated
using (exists (select 1 from public.jobs job where job.id = job_id and ((select private.is_admin()) or (job.customer_type = 'member' and job.user_id = (select auth.uid())))));
create policy notifications_select_owner on public.notifications for select to authenticated
using (recipient_user_id = (select auth.uid()));
create policy deliveries_select_owner_paid on public.deliveries for select to authenticated
using (
  (select private.is_admin()) or (
    hidden_at is null and deleted_at is null and expires_at > now()
    and exists (select 1 from public.jobs job where job.id = job_id and job.customer_type = 'member' and job.user_id = (select auth.uid()))
    and (admin_override or private.job_is_fully_paid(job_id))
  )
);

create function private.ensure_member_conversation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.customer_type = 'member' and new.user_id is not null then
    insert into public.conversations (job_id, member_user_id) values (new.id, new.user_id) on conflict (job_id) do nothing;
  end if;
  return new;
end; $$;
create trigger jobs_ensure_member_conversation after insert on public.jobs for each row execute function private.ensure_member_conversation();
insert into public.conversations (job_id, member_user_id)
select job.id, job.user_id from public.jobs job where job.customer_type = 'member' and job.user_id is not null on conflict (job_id) do nothing;

create function private.notify_member_quote() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid; v_notify boolean := false;
begin
  if new.status = 'sent' then
    if tg_op = 'INSERT' then v_notify := true; elsif old.status is distinct from new.status then v_notify := true; end if;
  end if;
  if v_notify then
    select request.user_id into v_user_id from public.commission_requests request where request.id = new.request_id and request.requester_type = 'member';
    if v_user_id is not null then insert into public.notifications (recipient_user_id, type, title, body, target_url, entity_type, entity_id) values (v_user_id, 'quote', '{"th":"ได้รับใบเสนอราคา","en":"Quote ready"}', '{"th":"เปิดดูราคาและรายละเอียดงานได้แล้ว","en":"Your quote and scope are ready"}', '/th/member/requests/' || new.request_id, 'quote', new.id); end if;
  end if; return new;
end; $$;
create trigger quotes_member_notification after insert or update of status on public.quotes for each row execute function private.notify_member_quote();

create function private.notify_member_payment() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.notifications (recipient_user_id, type, title, body, target_url, entity_type, entity_id) values (new.user_id, 'payment', '{"th":"ยืนยันการชำระเงินแล้ว","en":"Payment verified"}', '{"th":"ตรวจสอบยอดชำระเรียบร้อยแล้ว","en":"Your payment has been verified"}', '/th/member/payments', 'payment', new.id); return new; end; $$;
create trigger payments_member_notification after insert on public.payments for each row execute function private.notify_member_payment();

create function private.notify_member_status() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_job public.jobs%rowtype; v_status public.status_definitions%rowtype;
begin
  select * into v_job from public.jobs where id = new.job_id; select * into v_status from public.status_definitions where id = new.to_status_id;
  if v_job.customer_type = 'member' and v_job.user_id is not null and v_status.customer_visible then insert into public.notifications (recipient_user_id, type, title, body, target_url, entity_type, entity_id) values (v_job.user_id, 'status', '{"th":"สถานะงานอัปเดต","en":"Job status updated"}', v_status.label, '/th/member/jobs/' || v_job.id, 'job_status_history', new.id); end if; return new;
end; $$;
create trigger job_status_member_notification after insert on public.job_status_history for each row execute function private.notify_member_status();

create function private.member_send_job_message(p_job_id uuid, p_body text)
returns table(message_id uuid) language plpgsql security definer set search_path = '' as $$
declare v_conversation public.conversations%rowtype; v_message_id uuid;
begin
  if nullif(btrim(p_body), '') is null or char_length(btrim(p_body)) > 4000 then raise exception 'invalid_message'; end if;
  select conversation.* into v_conversation from public.conversations conversation join public.jobs job on job.id = conversation.job_id
  where conversation.job_id = p_job_id and conversation.member_user_id = auth.uid() and job.customer_type = 'member' and job.user_id = auth.uid() for update of conversation;
  if v_conversation.id is null then raise exception 'conversation_not_found'; end if;
  insert into public.messages (conversation_id, sender_user_id, sender_role, body) values (v_conversation.id, auth.uid(), 'member', btrim(p_body)) returning id into v_message_id;
  update public.conversations set last_message_at = now(), updated_at = now() where id = v_conversation.id;
  return query select v_message_id;
end; $$;

create function public.member_send_job_message(p_job_id uuid, p_body text)
returns table(message_id uuid) language sql security definer set search_path = '' as $$ select * from private.member_send_job_message(p_job_id, p_body) $$;

create function public.admin_send_job_message(p_job_id uuid, p_body text)
returns table(message_id uuid) language plpgsql security definer set search_path = '' as $$
declare v_conversation_id uuid; v_member_id uuid; v_message_id uuid;
begin
  if not private.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if nullif(btrim(p_body), '') is null or char_length(btrim(p_body)) > 4000 then raise exception 'invalid_message'; end if;
  select conversation.id, conversation.member_user_id into v_conversation_id, v_member_id from public.conversations conversation where conversation.job_id = p_job_id for update;
  if v_conversation_id is null then raise exception 'conversation_not_found'; end if;
  insert into public.messages (conversation_id, sender_user_id, sender_role, body) values (v_conversation_id, auth.uid(), 'admin', btrim(p_body)) returning id into v_message_id;
  update public.conversations set last_message_at = now(), updated_at = now() where id = v_conversation_id;
  insert into public.notifications (recipient_user_id, type, title, body, target_url, entity_type, entity_id)
  values (v_member_id, 'message', '{"th":"ข้อความใหม่","en":"New message"}', '{"th":"Nasora ส่งข้อความถึงคุณ","en":"Nasora sent you a message"}', '/th/member/messages?job=' || p_job_id, 'message', v_message_id);
  return query select v_message_id;
end; $$;

create function public.admin_post_job_progress(p_job_id uuid, p_title text, p_body text)
returns table(progress_id uuid) language plpgsql security definer set search_path = '' as $$
declare v_member_id uuid; v_progress_id uuid;
begin
  if not private.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if nullif(btrim(p_title), '') is null or char_length(btrim(p_title)) > 160 or nullif(btrim(p_body), '') is null or char_length(btrim(p_body)) > 4000 then raise exception 'invalid_progress'; end if;
  select job.user_id into v_member_id from public.jobs job where job.id = p_job_id and job.customer_type = 'member';
  if v_member_id is null then raise exception 'member_job_required'; end if;
  insert into public.job_progress_updates (job_id, created_by, title, body) values (p_job_id, auth.uid(), btrim(p_title), btrim(p_body)) returning id into v_progress_id;
  insert into public.notifications (recipient_user_id, type, title, body, target_url, entity_type, entity_id)
  values (v_member_id, 'progress', '{"th":"อัปเดตความคืบหน้า","en":"Progress update"}', jsonb_build_object('th', btrim(p_title), 'en', btrim(p_title)), '/th/member/jobs/' || p_job_id, 'progress', v_progress_id);
  return query select v_progress_id;
end; $$;

create function public.admin_post_job_progress_with_image(
  p_job_id uuid, p_title text, p_body text, p_object_key text,
  p_content_type text, p_size_bytes bigint, p_etag text
)
returns table(progress_id uuid) language plpgsql security definer set search_path = '' as $$
declare v_member_id uuid; v_progress_id uuid;
begin
  if not private.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if nullif(btrim(p_title), '') is null or char_length(btrim(p_title)) > 160 or nullif(btrim(p_body), '') is null or char_length(btrim(p_body)) > 4000
    or p_object_key !~ '^progress-images/[0-9a-f-]+\.(png|jpg|webp)$' or p_content_type not in ('image/png', 'image/jpeg', 'image/webp')
    or p_size_bytes not between 1 and 5242880 or nullif(btrim(p_etag), '') is null then raise exception 'invalid_progress'; end if;
  select job.user_id into v_member_id from public.jobs job where job.id = p_job_id and job.customer_type = 'member';
  if v_member_id is null then raise exception 'member_job_required'; end if;
  insert into public.job_progress_updates (job_id, created_by, title, body, image_object_key, image_content_type, image_size_bytes, image_etag)
  values (p_job_id, auth.uid(), btrim(p_title), btrim(p_body), p_object_key, p_content_type, p_size_bytes, p_etag) returning id into v_progress_id;
  insert into public.notifications (recipient_user_id, type, title, body, target_url, entity_type, entity_id)
  values (v_member_id, 'progress', '{"th":"อัปเดตความคืบหน้า","en":"Progress update"}', jsonb_build_object('th', btrim(p_title), 'en', btrim(p_title)), '/th/member/jobs/' || p_job_id, 'progress', v_progress_id);
  return query select v_progress_id;
end; $$;

create function private.member_send_job_message_with_image(
  p_job_id uuid, p_body text, p_object_key text, p_content_type text, p_size_bytes bigint, p_etag text
)
returns table(message_id uuid) language plpgsql security definer set search_path = '' as $$
declare v_conversation public.conversations%rowtype; v_message_id uuid;
begin
  if nullif(btrim(p_body), '') is null or char_length(btrim(p_body)) > 4000 or p_object_key !~ '^message-images/[0-9a-f-]+\.(png|jpg|webp)$'
    or p_content_type not in ('image/png', 'image/jpeg', 'image/webp') or p_size_bytes not between 1 and 5242880 or nullif(btrim(p_etag), '') is null then raise exception 'invalid_message'; end if;
  select conversation.* into v_conversation from public.conversations conversation join public.jobs job on job.id = conversation.job_id
  where conversation.job_id = p_job_id and conversation.member_user_id = auth.uid() and job.customer_type = 'member' and job.user_id = auth.uid() for update of conversation;
  if v_conversation.id is null then raise exception 'conversation_not_found'; end if;
  insert into public.messages (conversation_id, sender_user_id, sender_role, body) values (v_conversation.id, auth.uid(), 'member', btrim(p_body)) returning id into v_message_id;
  insert into public.message_assets (message_id, object_key, content_type, size_bytes, etag) values (v_message_id, p_object_key, p_content_type, p_size_bytes, p_etag);
  update public.conversations set last_message_at = now(), updated_at = now() where id = v_conversation.id;
  return query select v_message_id;
end; $$;

create function public.member_send_job_message_with_image(p_job_id uuid, p_body text, p_object_key text, p_content_type text, p_size_bytes bigint, p_etag text)
returns table(message_id uuid) language sql security definer set search_path = '' as $$ select * from private.member_send_job_message_with_image(p_job_id, p_body, p_object_key, p_content_type, p_size_bytes, p_etag) $$;

create function public.admin_send_job_message_with_image(p_job_id uuid, p_body text, p_object_key text, p_content_type text, p_size_bytes bigint, p_etag text)
returns table(message_id uuid) language plpgsql security definer set search_path = '' as $$
declare v_conversation_id uuid; v_member_id uuid; v_message_id uuid;
begin
  if not private.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if nullif(btrim(p_body), '') is null or char_length(btrim(p_body)) > 4000 or p_object_key !~ '^message-images/[0-9a-f-]+\.(png|jpg|webp)$'
    or p_content_type not in ('image/png', 'image/jpeg', 'image/webp') or p_size_bytes not between 1 and 5242880 or nullif(btrim(p_etag), '') is null then raise exception 'invalid_message'; end if;
  select conversation.id, conversation.member_user_id into v_conversation_id, v_member_id from public.conversations conversation where conversation.job_id = p_job_id for update;
  if v_conversation_id is null then raise exception 'conversation_not_found'; end if;
  insert into public.messages (conversation_id, sender_user_id, sender_role, body) values (v_conversation_id, auth.uid(), 'admin', btrim(p_body)) returning id into v_message_id;
  insert into public.message_assets (message_id, object_key, content_type, size_bytes, etag) values (v_message_id, p_object_key, p_content_type, p_size_bytes, p_etag);
  update public.conversations set last_message_at = now(), updated_at = now() where id = v_conversation_id;
  insert into public.notifications (recipient_user_id, type, title, body, target_url, entity_type, entity_id)
  values (v_member_id, 'message', '{"th":"ข้อความใหม่","en":"New message"}', '{"th":"Nasora ส่งข้อความและรูปภาพถึงคุณ","en":"Nasora sent you a message and image"}', '/th/member/messages?job=' || p_job_id, 'message', v_message_id);
  return query select v_message_id;
end; $$;

create function private.schedule_collaboration_cleanup() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.completed_at is not null and old.completed_at is null then
    update public.message_assets asset set delete_after = new.completed_at + interval '30 days'
    from public.messages message, public.conversations conversation
    where asset.message_id = message.id and message.conversation_id = conversation.id and conversation.job_id = new.id and asset.delete_after is null;
    update public.job_progress_updates progress set image_delete_after = new.completed_at + interval '30 days' where progress.job_id = new.id and progress.image_object_key is not null and progress.image_delete_after is null;
    insert into private.cleanup_tasks (target_type, target_id, due_at)
    select 'message_asset', asset.id, asset.delete_after from public.message_assets asset join public.messages message on message.id = asset.message_id join public.conversations conversation on conversation.id = message.conversation_id where conversation.job_id = new.id and asset.delete_after is not null on conflict (target_type, target_id) do nothing;
    insert into private.cleanup_tasks (target_type, target_id, due_at)
    select 'progress_image', progress.id, progress.image_delete_after from public.job_progress_updates progress where progress.job_id = new.id and progress.image_delete_after is not null on conflict (target_type, target_id) do nothing;
  end if;
  return new;
end; $$;
create trigger jobs_schedule_collaboration_cleanup after update of completed_at on public.jobs for each row execute function private.schedule_collaboration_cleanup();

create function public.admin_create_drive_delivery(p_job_id uuid, p_url text, p_display_name text)
returns table(delivery_id uuid) language plpgsql security definer set search_path = '' as $$
declare v_delivery_id uuid; v_member_id uuid;
begin
  if not private.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_url !~ '^https://drive\.google\.com/' or nullif(btrim(p_display_name), '') is null then raise exception 'invalid_delivery'; end if;
  select job.user_id into v_member_id from public.jobs job where job.id = p_job_id and job.customer_type = 'member';
  if v_member_id is null then raise exception 'member_job_required'; end if;
  insert into public.deliveries (job_id, kind, display_name, external_url, delivered_by)
  values (p_job_id, 'google_drive', btrim(p_display_name), p_url, auth.uid()) returning id into v_delivery_id;
  insert into public.notifications (recipient_user_id, type, title, body, target_url, entity_type, entity_id)
  values (v_member_id, 'delivery', '{"th":"ส่งมอบงานแล้ว","en":"Delivery ready"}', '{"th":"ไฟล์จะเปิดเมื่อชำระเงินครบ","en":"Your delivery unlocks after full payment"}', '/th/member/jobs/' || p_job_id, 'delivery', v_delivery_id);
  insert into private.cleanup_tasks (target_type, target_id, due_at) select 'delivery', v_delivery_id, delivery.expires_at from public.deliveries delivery where delivery.id = v_delivery_id;
  return query select v_delivery_id;
end; $$;

create function public.admin_create_file_delivery(
  p_job_id uuid, p_object_key text, p_display_name text,
  p_content_type text, p_size_bytes bigint, p_etag text
)
returns table(delivery_id uuid) language plpgsql security definer set search_path = '' as $$
declare v_delivery_id uuid; v_member_id uuid;
begin
  if not private.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_object_key !~ ('^deliveries/' || p_job_id || '/[^/]+$') or nullif(btrim(p_display_name), '') is null
    or p_size_bytes not between 1 and 26214400 or nullif(btrim(p_content_type), '') is null or nullif(btrim(p_etag), '') is null then raise exception 'invalid_delivery'; end if;
  select job.user_id into v_member_id from public.jobs job where job.id = p_job_id and job.customer_type = 'member';
  if v_member_id is null then raise exception 'member_job_required'; end if;
  insert into public.deliveries (job_id, kind, display_name, object_key, content_type, size_bytes, etag, delivered_by)
  values (p_job_id, 'r2_file', btrim(p_display_name), p_object_key, p_content_type, p_size_bytes, p_etag, auth.uid()) returning id into v_delivery_id;
  insert into public.notifications (recipient_user_id, type, title, body, target_url, entity_type, entity_id)
  values (v_member_id, 'delivery', '{"th":"ส่งมอบงานแล้ว","en":"Delivery ready"}', '{"th":"ไฟล์จะเปิดเมื่อชำระเงินครบ","en":"Your delivery unlocks after full payment"}', '/th/member/jobs/' || p_job_id, 'delivery', v_delivery_id);
  insert into private.cleanup_tasks (target_type, target_id, due_at) select 'delivery', v_delivery_id, delivery.expires_at from public.deliveries delivery where delivery.id = v_delivery_id;
  return query select v_delivery_id;
end; $$;

create function public.member_mark_notifications_read()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  update public.notifications set read_at = coalesce(read_at, now()) where recipient_user_id = auth.uid() and read_at is null and archived_at is null;
  get diagnostics v_count = row_count; return v_count;
end; $$;

create function public.claim_cleanup_batch(p_limit integer default 10)
returns table(task_id uuid, target_type text, target_id uuid, object_key text, delivery_kind text)
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with claimed as (
    select task.id from private.cleanup_tasks task where task.status in ('pending', 'failed') and task.attempts < 5 and task.due_at <= now()
    order by task.due_at for update skip locked limit least(greatest(p_limit, 1), 20)
  ), updated as (
    update private.cleanup_tasks task set status = 'processing', attempts = task.attempts + 1 from claimed where task.id = claimed.id
    returning task.id, task.target_type, task.target_id
  )
  select updated.id, updated.target_type, updated.target_id,
    case updated.target_type when 'delivery' then delivery.object_key when 'message_asset' then asset.object_key when 'progress_image' then progress.image_object_key end,
    case when updated.target_type = 'delivery' then delivery.kind end
  from updated
  left join public.deliveries delivery on updated.target_type = 'delivery' and delivery.id = updated.target_id
  left join public.message_assets asset on updated.target_type = 'message_asset' and asset.id = updated.target_id
  left join public.job_progress_updates progress on updated.target_type = 'progress_image' and progress.id = updated.target_id;
end; $$;

create function public.complete_cleanup_task(p_task_id uuid, p_success boolean, p_error text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_task private.cleanup_tasks%rowtype; v_delivery public.deliveries%rowtype;
begin
  select * into v_task from private.cleanup_tasks where id = p_task_id and status = 'processing' for update;
  if v_task.id is null then return; end if;
  if not p_success then
    update private.cleanup_tasks set status = 'failed', last_error = left(coalesce(p_error, 'cleanup_failed'), 500) where id = p_task_id;
    return;
  end if;
  if v_task.target_type = 'delivery' then
    select * into v_delivery from public.deliveries where id = v_task.target_id for update;
    update public.deliveries set hidden_at = coalesce(hidden_at, now()), deleted_at = case when kind = 'r2_file' then coalesce(deleted_at, now()) else deleted_at end where id = v_task.target_id;
  elsif v_task.target_type = 'message_asset' then update public.message_assets set deleted_at = coalesce(deleted_at, now()) where id = v_task.target_id;
  elsif v_task.target_type = 'progress_image' then update public.job_progress_updates set image_object_key = null, image_content_type = null, image_size_bytes = null, image_etag = null where id = v_task.target_id;
  end if;
  update private.cleanup_tasks set status = 'complete', last_error = null where id = p_task_id;
end; $$;

create function public.gateway_get_private_asset(p_kind text, p_id uuid, p_user_id uuid, p_admin boolean default false)
returns table(asset_kind text, object_key text, external_url text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_user_id is null or p_kind not in ('message_asset', 'progress_image', 'delivery') then raise exception 'invalid_asset_request'; end if;
  if p_kind = 'message_asset' then
    return query select 'r2_file'::text, asset.object_key, null::text from public.message_assets asset join public.messages message on message.id = asset.message_id join public.conversations conversation on conversation.id = message.conversation_id where asset.id = p_id and asset.deleted_at is null and (p_admin or conversation.member_user_id = p_user_id);
  elsif p_kind = 'progress_image' then
    return query select 'r2_file'::text, progress.image_object_key, null::text from public.job_progress_updates progress join public.jobs job on job.id = progress.job_id where progress.id = p_id and progress.image_object_key is not null and (p_admin or (job.customer_type = 'member' and job.user_id = p_user_id));
  else
    return query select delivery.kind, delivery.object_key, delivery.external_url from public.deliveries delivery join public.jobs job on job.id = delivery.job_id where delivery.id = p_id and delivery.hidden_at is null and delivery.deleted_at is null and delivery.expires_at > now() and (p_admin or (job.customer_type = 'member' and job.user_id = p_user_id and (delivery.admin_override or private.job_is_fully_paid(job.id))));
  end if;
end; $$;

revoke all on public.conversations, public.messages, public.message_assets, public.conversation_reads, public.job_progress_updates, public.notifications, public.deliveries from public, anon, authenticated, service_role;
grant select on public.conversations, public.messages, public.conversation_reads, public.notifications to authenticated;
grant select (id, message_id, content_type, size_bytes, delete_after, deleted_at, created_at) on public.message_assets to authenticated;
grant select (id, job_id, created_by, title, body, image_content_type, image_size_bytes, image_delete_after, created_at) on public.job_progress_updates to authenticated;
grant select (id, job_id, kind, display_name, delivered_at, expires_at, hidden_at, deleted_at, admin_override, created_at) on public.deliveries to authenticated;
revoke all on private.cleanup_tasks from public, anon, authenticated, service_role;
revoke all on function private.set_delivery_expiry(), private.job_is_fully_paid(uuid), private.ensure_member_conversation(), private.notify_member_quote(), private.notify_member_payment(), private.notify_member_status(), private.member_send_job_message(uuid, text), private.member_send_job_message_with_image(uuid, text, text, text, bigint, text), private.schedule_collaboration_cleanup() from public, anon, authenticated, service_role;
revoke all on function public.member_send_job_message(uuid, text), public.member_send_job_message_with_image(uuid, text, text, text, bigint, text), public.member_mark_notifications_read(), public.admin_send_job_message(uuid, text), public.admin_send_job_message_with_image(uuid, text, text, text, bigint, text), public.admin_post_job_progress(uuid, text, text), public.admin_post_job_progress_with_image(uuid, text, text, text, text, bigint, text), public.admin_create_drive_delivery(uuid, text, text), public.admin_create_file_delivery(uuid, text, text, text, bigint, text), public.claim_cleanup_batch(integer), public.complete_cleanup_task(uuid, boolean, text), public.gateway_get_private_asset(text, uuid, uuid, boolean) from public, anon, authenticated, service_role;
grant execute on function public.member_send_job_message(uuid, text), public.member_send_job_message_with_image(uuid, text, text, text, bigint, text), public.member_mark_notifications_read(), public.admin_send_job_message(uuid, text), public.admin_send_job_message_with_image(uuid, text, text, text, bigint, text), public.admin_post_job_progress(uuid, text, text), public.admin_post_job_progress_with_image(uuid, text, text, text, text, bigint, text), public.admin_create_drive_delivery(uuid, text, text), public.admin_create_file_delivery(uuid, text, text, text, bigint, text) to authenticated;
grant execute on function public.claim_cleanup_batch(integer), public.complete_cleanup_task(uuid, boolean, text) to service_role;
grant execute on function public.gateway_get_private_asset(text, uuid, uuid, boolean) to service_role;

-- Runtime migration, RLS role simulation, Realtime publication, and scheduler
-- configuration must be verified against the linked Supabase project at deploy.

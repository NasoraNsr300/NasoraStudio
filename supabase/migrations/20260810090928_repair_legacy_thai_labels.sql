update public.status_workflows
set
  name = jsonb_set(name, '{th}', to_jsonb('ขั้นตอนงานมาตรฐาน'::text), true),
  updated_at = now()
where stable_key = 'nasora_default';

update public.status_definitions as definition
set
  label = jsonb_set(definition.label, '{th}', to_jsonb(replacement.label_th), true),
  updated_at = now()
from (
  values
    ('waiting', 'รอเริ่มงาน'),
    ('sketching', 'กำลังร่าง'),
    ('coloring', 'ลงสี'),
    ('review', 'รอตรวจ'),
    ('delivery', 'ส่งมอบงาน'),
    ('completed', 'เสร็จสิ้น'),
    ('cancelled', 'ยกเลิก')
) as replacement(stable_key, label_th)
join public.status_workflows as workflow
  on workflow.stable_key = 'nasora_default'
where definition.workflow_id = workflow.id
  and definition.stable_key = replacement.stable_key;

update public.request_answers
set field_label_snapshot = case field_key
  when 'form_version' then '{"th":"เวอร์ชันแบบประเมิน","en":"Form version"}'::jsonb
  when 'accepted_legal' then '{"th":"ยอมรับนโยบายและข้อกำหนด","en":"Accepted policies and terms"}'::jsonb
  else field_label_snapshot
end
where field_key in ('form_version', 'accepted_legal');

create function private.normalize_request_answer_label()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.field_key = 'form_version' then
    new.field_label_snapshot := '{"th":"เวอร์ชันแบบประเมิน","en":"Form version"}'::jsonb;
  elsif new.field_key = 'accepted_legal' then
    new.field_label_snapshot := '{"th":"ยอมรับนโยบายและข้อกำหนด","en":"Accepted policies and terms"}'::jsonb;
  end if;
  return new;
end;
$$;

create trigger normalize_request_answer_label_before_insert
before insert on public.request_answers
for each row execute function private.normalize_request_answer_label();

revoke all on function private.normalize_request_answer_label()
from public, anon, authenticated, service_role;

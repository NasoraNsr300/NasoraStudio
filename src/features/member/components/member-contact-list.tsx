"use client";

import { AtSign, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import type { Locale } from "@/shared/i18n/locales";
import type { ContactChannel } from "../data/member-profile-repository";
import styles from "./member-pages.module.css";

type ContactInput = { kind: string; value: string };
type ContactResult = Promise<{ ok: true } | { message: string; ok: false }>;

export function MemberContactList({ contacts, locale, onAdd, onRemove, onSetDefault, onUpdate }: {
  contacts: ContactChannel[];
  locale: Locale;
  onAdd(input: ContactInput): ContactResult;
  onRemove(id: string): ContactResult;
  onSetDefault(id: string): ContactResult;
  onUpdate(id: string, input: ContactInput): ContactResult;
}) {
  const th = locale === "th";
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [kind, setKind] = useState("Discord");
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");

  function edit(contact: ContactChannel) {
    setEditingId(contact.id);
    setKind(contact.kind);
    setValue(contact.value);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim()) return setMessage(th ? "กรุณากรอกช่องทางติดต่อ" : "Enter contact details");
    const result = editingId === "new"
      ? await onAdd({ kind, value: value.trim() })
      : await onUpdate(editingId ?? "", { kind, value: value.trim() });
    setMessage(result.ok ? (th ? "บันทึกช่องทางแล้ว" : "Contact saved") : result.message);
    if (result.ok) { setEditingId(null); setValue(""); }
  }

  async function act(action: () => ContactResult, success: string) {
    const result = await action();
    setMessage(result.ok ? success : result.message);
  }

  return <section className={`${styles.surface} ${styles.profileCard}`}>
    <h2><AtSign size={18} />{th ? "ช่องทางติดต่อ" : "Contact channels"}</h2>
    {contacts.length === 0 && <p className={styles.emptyCopy}>{th ? "ยังไม่มีช่องทางติดต่อ" : "No contact channels yet"}</p>}
    {contacts.map((contact) => <div className={styles.contactItem} key={contact.id}><span><AtSign size={15} /></span><div><small>{contact.kind}</small><strong>{contact.value}</strong></div><div className={styles.contactControls}>{contact.isDefault ? <em>{th ? "ค่าเริ่มต้น" : "Default"}</em> : <button aria-label={th ? "ตั้งเป็นหลัก" : "Make default"} className={styles.outlineButton} onClick={() => void act(() => onSetDefault(contact.id), th ? "ตั้งเป็นช่องทางหลักแล้ว" : "Default contact updated")} type="button">{th ? "ตั้งเป็นหลัก" : "Make default"}</button>}<button aria-label={`${th ? "แก้ไข" : "Edit"} ${contact.kind}`} className={styles.iconButton} onClick={() => edit(contact)} type="button"><Pencil size={14} /></button><button aria-label={`${th ? "ลบ" : "Remove"} ${contact.kind}`} className={styles.iconButton} onClick={() => void act(() => onRemove(contact.id), th ? "ลบช่องทางแล้ว" : "Contact removed")} type="button"><Trash2 size={14} /></button></div></div>)}
    {editingId && <form className={styles.contactForm} onSubmit={submit}><label className={styles.field}>{th ? "ประเภทช่องทาง" : "Contact type"}<select aria-label={th ? "ประเภทช่องทาง" : "Contact type"} onChange={(event) => setKind(event.target.value)} value={kind}><option>Discord</option><option>Email</option><option>Facebook</option><option>X</option><option>อื่น ๆ</option></select></label><label className={styles.field}>{th ? "ค่าช่องทางติดต่อ" : "Contact details"}<input aria-label={th ? "ค่าช่องทางติดต่อ" : "Contact details"} maxLength={200} onChange={(event) => setValue(event.target.value)} value={value} /></label><div className={styles.profileActions}><button className={styles.outlineButton} onClick={() => setEditingId(null)} type="button">{th ? "ยกเลิก" : "Cancel"}</button><button className={styles.goldButton} type="submit">{editingId === "new" ? (th ? "เพิ่มช่องทางติดต่อ" : "Add contact") : (th ? "บันทึกช่องทาง" : "Save contact")}</button></div></form>}
    <p aria-live="polite" className={styles.formMessage} role="status">{message}</p>
    {!editingId && <div className={styles.profileActions}><button className={styles.outlineButton} onClick={() => { setEditingId("new"); setKind("Discord"); setValue(""); }} type="button"><Plus size={15} /> {th ? "เพิ่มช่องทาง" : "Add contact"}</button></div>}
  </section>;
}

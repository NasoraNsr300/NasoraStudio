"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import styles from "@/features/admin/components/admin-dashboard.module.css";
import type { AdminNotificationItem } from "@/features/admin/notifications/domain/admin-notification";

export function AdminNotificationMenu({ initialItems }: { initialItems: AdminNotificationItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const unread = items.filter((item) => !item.read).length;
  async function markDisplayedRead() {
    const ids = items.filter((item) => !item.read).map((item) => item.id);
    if (!ids.length || saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/notifications/read", { body: JSON.stringify({ notificationIds: ids }), headers: { "content-type": "application/json" }, method: "POST" });
      if (response.ok) setItems((current) => current.map((item) => ({ ...item, read: true })));
    } finally { setSaving(false); }
  }
  return <div className={styles.notificationRoot}>
    <button aria-expanded={open} aria-label="การแจ้งเตือน" className={styles.bell} onClick={() => setOpen((value) => !value)} type="button"><Bell size={23} />{unread ? <b>{unread > 99 ? "99+" : unread}</b> : null}</button>
    {open ? <section aria-label="รายการแจ้งเตือน" className={styles.notificationMenu}>
      <header><h2>การแจ้งเตือน</h2>{unread ? <button disabled={saving} onClick={() => void markDisplayedRead()} type="button">ทำเครื่องหมายว่าอ่านแล้วทั้งหมด</button> : null}</header>
      {items.length ? <ul>{items.map((item) => <li data-read={item.read} key={item.id}><Link href={item.href} onClick={() => setOpen(false)}><strong>{item.title}</strong><span>{item.detail}</span><time>{new Date(item.occurredAt).toLocaleString("th-TH")}</time></Link></li>)}</ul> : <p>ไม่มีการแจ้งเตือนใหม่</p>}
    </section> : null}
  </div>;
}

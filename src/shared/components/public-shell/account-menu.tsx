"use client";

import { ArrowLeft, Bell, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";

import type { Locale } from "@/shared/i18n/locales";

import styles from "./public-shell.module.css";

export type AccountNotification = { body: string; createdAt: string; id: string; read: boolean; targetUrl: string; title: string };
type AccountMenuProps = { isAdmin: boolean; locale: Locale; nickname: string; onClose(): void; onShowNotifications(): void; onSignOut(): void | Promise<void>; unreadCount?: number };
type NotificationPanelProps = { locale: Locale; notifications?: AccountNotification[]; onBack(): void };

export function AccountMenu({ isAdmin, locale, nickname, onClose, onShowNotifications, onSignOut, unreadCount = 0 }: AccountMenuProps) {
  const th = locale === "th";
  const initial = nickname.trim().charAt(0).toUpperCase() || "M";
  return <section aria-label={th ? "เมนูบัญชี" : "Account menu"} className={styles.accountPanel}>
    <header className={styles.accountSummary}><i aria-hidden="true" className={styles.accountAvatarFallback}>{initial}</i><span><strong>{nickname}</strong><small>{th ? "สมาชิก" : "Member"}</small></span></header>
    <div className={styles.accountMenuList}>
      <button className={styles.accountMenuItem} onClick={onShowNotifications} type="button"><Bell size={19} /><span>{th ? "แจ้งเตือน" : "Notifications"}</span>{unreadCount > 0 ? <b aria-label={th ? `${unreadCount} รายการที่ยังไม่ได้อ่าน` : `${unreadCount} unread`}>{unreadCount}</b> : null}</button>
      <Link className={styles.accountMenuItem} href={`/${locale}/member/requests`} onClick={onClose}><LayoutDashboard size={19} /><span>{th ? "พื้นที่สมาชิก" : "Member area"}</span></Link>
      {isAdmin ? <Link className={styles.accountMenuItem} href="/admin" onClick={onClose}><ShieldCheck size={19} /><span>{th ? "พื้นที่แอดมิน" : "Admin area"}</span></Link> : null}
      <button className={styles.accountMenuItem} onClick={onSignOut} type="button"><LogOut size={19} /><span>{th ? "ออกจากระบบ" : "Sign out"}</span></button>
    </div>
  </section>;
}

export function NotificationPanel({ locale, notifications = [], onBack }: NotificationPanelProps) {
  const th = locale === "th"; const unread = notifications.filter((item) => !item.read).length;
  return <section aria-label={th ? "รายการแจ้งเตือน" : "Notification list"} className={`${styles.accountPanel} ${styles.notificationPanel}`}>
    <header className={styles.notificationHeader}><button aria-label={th ? "กลับไปเมนูบัญชี" : "Back to account menu"} onClick={onBack} type="button"><ArrowLeft size={18} /></button><h2>{th ? "แจ้งเตือน" : "Notifications"}</h2><span>{unread}</span></header>
    <div className={styles.notificationList}>{notifications.length === 0 ? <p>{th ? "ยังไม่มีการแจ้งเตือน" : "No notifications yet."}</p> : notifications.map((item) => <article key={item.id}><span aria-hidden="true"><Bell size={15} /></span><div><Link href={item.targetUrl}><strong>{item.title}</strong></Link><p>{item.body}</p><time>{new Date(item.createdAt).toLocaleString(locale)}</time></div></article>)}</div>
  </section>;
}

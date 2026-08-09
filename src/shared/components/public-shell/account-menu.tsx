"use client";

import { ArrowLeft, Bell, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";

import type { Locale } from "@/shared/i18n/locales";

import styles from "./public-shell.module.css";

type AccountMenuProps = {
  isAdmin: boolean;
  locale: Locale;
  nickname: string;
  onClose: () => void;
  onShowNotifications: () => void;
  onSignOut: () => void | Promise<void>;
};

type NotificationPanelProps = {
  locale: Locale;
  onBack: () => void;
};

const notifications = {
  th: [
    ["อัปเดตความคืบหน้างาน", "Nasora อัปโหลดภาพร่างขั้นต้นแล้ว", "5 นาที"],
    ["ยืนยันการชำระเงินแล้ว", "ตรวจสอบยอดมัดจำ 3,250 THB เรียบร้อย", "2 ชม."],
    ["ได้รับใบเสนอราคา", "ใบประเมิน Chibi พร้อมให้ตรวจสอบ", "1 วัน"],
  ],
  en: [
    ["New work update", "Nasora uploaded the initial sketch.", "5 min"],
    ["Payment verified", "Your THB 3,250 deposit was verified.", "2 hr"],
    ["Quote received", "Your Chibi estimate is ready to review.", "1 day"],
  ],
} as const;

export function AccountMenu({ isAdmin, locale, nickname, onClose, onShowNotifications, onSignOut }: AccountMenuProps) {
  const th = locale === "th";
  return <section aria-label={th ? "เมนูบัญชี" : "Account menu"} className={styles.accountPanel}>
    <header className={styles.accountSummary}>
      {/* eslint-disable-next-line @next/next/no-img-element -- fixture avatar */}
      <img alt={nickname} src="/fixtures/derivatives/moonlit-thumbnail.webp" />
      <span><strong>{nickname}</strong><small>{th ? "สมาชิก" : "Member"}</small></span>
    </header>
    <div className={styles.accountMenuList}>
      <button className={styles.accountMenuItem} onClick={onShowNotifications} type="button">
        <Bell size={19} /><span>{th ? "แจ้งเตือน" : "Notifications"}</span>
        <b aria-label={th ? "3 รายการที่ยังไม่ได้อ่าน" : "3 unread"}>3</b>
      </button>
      <Link className={styles.accountMenuItem} href={`/${locale}/member/requests`} onClick={onClose}>
        <LayoutDashboard size={19} /><span>{th ? "พื้นที่สมาชิก" : "Member area"}</span>
      </Link>
      {isAdmin ? <Link className={styles.accountMenuItem} href="/admin" onClick={onClose}>
        <ShieldCheck size={19} /><span>{th ? "พื้นที่แอดมิน" : "Admin area"}</span>
      </Link> : null}
      <button className={styles.accountMenuItem} onClick={onSignOut} type="button"><LogOut size={19} /><span>{th ? "ออกจากระบบ" : "Sign out"}</span></button>
    </div>
  </section>;
}

export function NotificationPanel({ locale, onBack }: NotificationPanelProps) {
  const th = locale === "th";
  return <section aria-label={th ? "รายการแจ้งเตือน" : "Notification list"} className={`${styles.accountPanel} ${styles.notificationPanel}`}>
    <header className={styles.notificationHeader}>
      <button aria-label={th ? "กลับไปเมนูบัญชี" : "Back to account menu"} onClick={onBack} type="button"><ArrowLeft size={18} /></button>
      <h2>{th ? "แจ้งเตือน" : "Notifications"}</h2><span>3</span>
    </header>
    <div className={styles.notificationList}>{notifications[locale].map(([title, body, time]) => <article key={title}>
      <span aria-hidden="true"><Bell size={15} /></span><div><strong>{title}</strong><p>{body}</p><time>{time}</time></div>
    </article>)}</div>
  </section>;
}

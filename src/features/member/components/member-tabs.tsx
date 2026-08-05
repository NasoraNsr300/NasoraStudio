import { CircleUserRound, FileText, MessageSquareText, WalletCards } from "lucide-react";
import Link from "next/link";

import type { Locale } from "@/shared/i18n/locales";

import styles from "./member-tabs.module.css";

export type MemberTab = "requests" | "messages" | "payments" | "profile";

const tabs = [
  { icon: FileText, id: "requests" },
  { icon: MessageSquareText, id: "messages" },
  { icon: WalletCards, id: "payments" },
  { icon: CircleUserRound, id: "profile" },
] as const;

const labels: Record<Locale, Record<MemberTab, string>> = {
  th: { requests: "แบบประเมิน", messages: "ข้อความ", payments: "การชำระเงิน", profile: "โปรไฟล์" },
  en: { requests: "Requests", messages: "Messages", payments: "Payments", profile: "Profile" },
};

export function MemberTabs({ active, locale }: { active: MemberTab; locale: Locale }) {
  return <nav aria-label={locale === "th" ? "เมนูพื้นที่สมาชิก" : "Member area"} className={styles.tabs}>
    {tabs.map(({ icon: Icon, id }) => <Link aria-current={active === id ? "page" : undefined} href={`/${locale}/member/${id}`} key={id}>
      <Icon size={18} /><span>{labels[locale][id]}</span>
      {id === "messages" ? <b aria-label={locale === "th" ? "3 ข้อความที่ยังไม่ได้อ่าน" : "3 unread messages"}>3</b> : null}
    </Link>)}
  </nav>;
}

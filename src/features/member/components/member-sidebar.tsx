"use client";

import { CircleUserRound, FileText, FolderOpen, HelpCircle, MessageSquareText, WalletCards } from "lucide-react";
import Link from "next/link";

import { useAuthSession } from "@/shared/auth/auth-session-provider";
import type { Locale } from "@/shared/i18n/locales";
import { useOptionalPublicSiteSettings } from "@/features/site-settings/components/public-site-settings-provider";
import { MemberAvatar } from "@/shared/components/member-avatar/member-avatar";

import styles from "./member-sidebar.module.css";

export type MemberSection = "jobs" | "requests" | "messages" | "payments" | "profile";

const labels = {
  th: ["งานของฉัน", "แบบประเมิน", "ข้อความ", "การชำระเงิน", "โปรไฟล์"],
  en: ["My jobs", "Requests", "Messages", "Payments", "Profile"],
} as const;

const sections: MemberSection[] = ["jobs", "requests", "messages", "payments", "profile"];
const icons = [FolderOpen, FileText, MessageSquareText, WalletCards, CircleUserRound];

function hrefFor(locale: Locale, section: MemberSection) {
  return `/${locale}/member/${section}`;
}

export function MemberSidebar({
  active,
  locale,
  onSelectSection,
}: {
  active: MemberSection;
  locale: Locale;
  onSelectSection?: (section: MemberSection) => void;
}) {
  const { user } = useAuthSession();
  const settings = useOptionalPublicSiteSettings();
  const nickname = user?.nickname ?? "Member";

  return (
    <aside className={styles.sidebar}>
      <div className={styles.identity}>
        <MemberAvatar avatarMediaId={user?.avatarMediaId} className={styles.avatarFallback} nickname={nickname} />
        <strong>{nickname}</strong>
        <span>{locale === "th" ? "สมาชิก" : "Member"}</span>
      </div>
      <nav>
        {sections.map((section, index) => {
          const Icon = icons[index];
          return (
            <Link
              aria-current={active === section ? "page" : undefined}
              href={hrefFor(locale, section)}
              key={section}
              onClick={(e) => {
                if (onSelectSection) {
                  e.preventDefault();
                  onSelectSection(section);
                }
              }}
            >
              <Icon size={19} />
              {labels[locale][index]}
            </Link>
          );
        })}
      </nav>
      <div className={styles.help}>
        <HelpCircle size={20} />
        <strong>{locale === "th" ? "ต้องการความช่วยเหลือ?" : "Need help?"}</strong>
        <a href={`mailto:${settings?.contactEmail ?? "nasora.nsr300@gmail.com"}`}>
          {locale === "th" ? "ติดต่อทีมงาน" : "Contact support"}
        </a>
      </div>
    </aside>
  );
}

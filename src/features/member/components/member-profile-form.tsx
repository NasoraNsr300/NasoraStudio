"use client";

import { Languages, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";

import type { Locale } from "@/shared/i18n/locales";
import styles from "./member-pages.module.css";

type ProfileInput = { nickname: string; preferredLocale: "th" | "en" };
type ActionResult = { ok: true } | { message: string; ok: false };

export function MemberProfileForm({ initialProfile, locale, onSave }: {
  initialProfile: ProfileInput;
  locale: Locale;
  onSave(input: ProfileInput): Promise<ActionResult>;
}) {
  const th = locale === "th";
  const [nickname, setNickname] = useState(initialProfile.nickname);
  const [preferredLocale, setPreferredLocale] = useState<"th" | "en">(initialProfile.preferredLocale);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!nickname.trim()) return setMessage(th ? "กรุณากรอกชื่อที่ใช้แสดง" : "Enter a display name");
    setPending(true);
    const result = await onSave({ nickname: nickname.trim(), preferredLocale });
    setPending(false);
    setMessage(result.ok ? (th ? "บันทึกข้อมูลแล้ว" : "Profile saved") : result.message);
  }

  return <section className={`${styles.surface} ${styles.profileCard}`}>
    <h2><UserRound size={18} />{th ? "ข้อมูลส่วนตัว" : "Personal information"}</h2>
    <div className={styles.avatarEditor}>
      {/* eslint-disable-next-line @next/next/no-img-element -- existing fixture avatar */}
      <img alt={nickname} src="/fixtures/derivatives/moonlit-thumbnail.webp" />
      <div><strong>{nickname}</strong><p><button disabled type="button">{th ? "เปลี่ยนรูปโปรไฟล์ (เร็ว ๆ นี้)" : "Change avatar (coming soon)"}</button></p></div>
    </div>
    <form onSubmit={submit}>
      <label className={styles.field}>{th ? "ชื่อที่ใช้แสดง (Nickname)" : "Display name (Nickname)"}<input aria-label="Nickname" maxLength={60} onChange={(event) => setNickname(event.target.value)} value={nickname} /></label>
      <label className={styles.field}><span><Languages size={14} />{th ? "ภาษาที่ต้องการ" : "Preferred language"}</span><select aria-label={th ? "ภาษาที่ต้องการ" : "Preferred language"} onChange={(event) => setPreferredLocale(event.target.value as "th" | "en")} value={preferredLocale}><option value="th">ไทย</option><option value="en">English</option></select></label>
      <p aria-live="polite" className={styles.formMessage} role="status">{message}</p>
      <div className={styles.profileActions}><button className={styles.goldButton} disabled={pending} type="submit">{pending ? (th ? "กำลังบันทึก…" : "Saving…") : (th ? "บันทึกข้อมูล" : "Save profile")}</button></div>
    </form>
  </section>;
}

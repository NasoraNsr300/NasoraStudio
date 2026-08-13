"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useAuthSession } from "@/shared/auth/auth-session-provider";
import type { Locale } from "@/shared/i18n/locales";
import { createSupabaseBrowserClient } from "@/shared/supabase/client";

import { MemberContactList } from "./member-contact-list";
import { MemberPasswordForm } from "./member-password-form";
import { MemberProfileForm } from "./member-profile-form";
import { MemberSidebar, type MemberSection } from "./member-sidebar";
import type { ContactChannel, MemberProfile, MemberProfileClient } from "../data/member-profile-repository";
import { createMemberProfileRepository } from "../data/member-profile-repository";
import styles from "./member-pages.module.css";

export function MemberProfileContent({ locale, profileClient }: { locale: Locale; profileClient?: MemberProfileClient }) {
  const th = locale === "th";
  const { signIn, status, updateAvatarMediaId, updateNickname, updatePassword, user } = useAuthSession();
  const client = useMemo(() => profileClient ?? (createSupabaseBrowserClient() as unknown as MemberProfileClient), [profileClient]);
  const repository = useMemo(() => user ? createMemberProfileRepository(client, user.id) : null, [client, user]);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [contacts, setContacts] = useState<ContactChannel[]>([]);
  const [loadMessage, setLoadMessage] = useState("");

  useEffect(() => {
    if (!repository) return;
    let active = true;
    void repository.load().then((result) => {
      if (!active) return;
      if (!result.ok) {
        setLoadMessage(th ? "ไม่สามารถโหลดข้อมูลโปรไฟล์ได้" : "Unable to load profile data");
        return;
      }
      setProfile(result.data.profile);
      setContacts(result.data.contacts);
      setLoadMessage("");
    });
    return () => { active = false; };
  }, [repository, th]);

  const profileValue = profile ?? {
    nickname: user?.nickname ?? "Member",
    preferredLocale: locale,
    userId: user?.id ?? "",
  };

  return (
    <section className={styles.pagePanel}>
      <header className={styles.pageHeader}><div><h1>{th ? "โปรไฟล์" : "Profile"}</h1><p>{th ? "จัดการชื่อ ช่องทางติดต่อ ภาษา และความปลอดภัยของบัญชี" : "Manage your nickname, contacts, language, and account security."}</p></div></header>
      {status === "loading" && <p className={styles.loadingCopy}>{th ? "กำลังโหลดข้อมูลสมาชิก…" : "Loading member profile…"}</p>}
      {loadMessage && <p aria-live="polite" className={styles.errorMessage} role="alert">{loadMessage}</p>}
      {user && repository && <div className={styles.profileGrid}>
        <MemberProfileForm avatarMediaId={user.avatarMediaId} initialProfile={{ nickname: profileValue.nickname, preferredLocale: profileValue.preferredLocale }} key={`${profileValue.nickname}-${profileValue.preferredLocale}`} locale={locale} onAvatarUploaded={updateAvatarMediaId} onSave={async (input) => {
          const result = await repository.updateProfile(input);
          if (result.ok) {
            setProfile(result.data);
            const identityResult = await updateNickname(input.nickname);
            if (identityResult.error) return { message: identityResult.error.message ?? "Unable to update nickname", ok: false as const };
          }
          return result;
        }} />
        <MemberContactList contacts={contacts} locale={locale} onAdd={async (input) => {
          const result = await repository.addContact(input);
          if (result.ok) setContacts((current) => [...current, result.data]);
          return result;
        }} onRemove={async (id) => {
          const result = await repository.removeContact(id);
          if (result.ok) setContacts((current) => current.filter((contact) => contact.id !== id));
          return result;
        }} onSetDefault={async (id) => {
          const result = await repository.setDefaultContact(id);
          if (result.ok) setContacts((current) => current.map((contact) => ({ ...contact, isDefault: contact.id === id })));
          return result;
        }} onUpdate={async (id, input) => {
          const result = await repository.updateContact(id, input);
          if (result.ok) setContacts((current) => current.map((contact) => contact.id === id ? result.data : contact));
          return result;
        }} />
        {user.email && <MemberPasswordForm email={user.email} locale={locale} onReauthenticate={signIn} onUpdatePassword={updatePassword} />}
        <section className={`${styles.surface} ${styles.profileCard}`}><h2><ShieldCheck size={18} />{th ? "บัญชีและความปลอดภัย" : "Account and security"}</h2><p>{th ? "ระบบป้องกันพื้นที่สมาชิกด้วยบัญชี Supabase และแจ้งผลเมื่อมีการเปลี่ยนข้อมูลสำคัญ" : "Your member area is protected by your Supabase account, with feedback for important account changes."}</p><label className={styles.field}>Email<input disabled value={user.email ?? ""} /></label></section>
      </div>}
    </section>
  );
}

export function MemberProfilePage({
  locale,
  onSelectSection,
  profileClient,
}: {
  locale: Locale;
  onSelectSection?: (section: MemberSection) => void;
  profileClient?: MemberProfileClient;
}) {
  return (
    <main className={styles.memberArea}>
      <MemberSidebar active="profile" locale={locale} onSelectSection={onSelectSection} />
      <MemberProfileContent locale={locale} profileClient={profileClient} />
    </main>
  );
}

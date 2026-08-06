"use client";

import { KeyRound, LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";

import { localizeAuthError } from "@/shared/auth/auth-errors";
import type { AuthOperationResult } from "@/shared/auth/auth-types";
import type { Locale } from "@/shared/i18n/locales";
import styles from "./member-pages.module.css";

export function MemberPasswordForm({
  email,
  locale,
  onReauthenticate,
  onUpdatePassword,
}: {
  email: string;
  locale: Locale;
  onReauthenticate(input: { email: string; password: string }): Promise<AuthOperationResult>;
  onUpdatePassword(password: string): Promise<AuthOperationResult>;
}) {
  const th = locale === "th";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmation) return setMessage(th ? "รหัสผ่านใหม่ไม่ตรงกัน" : "New passwords do not match");
    if (newPassword.length < 8) return setMessage(th ? "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร" : "New password must be at least 8 characters");
    setPending(true);
    const reauthenticated = await onReauthenticate({ email, password: currentPassword });
    if (reauthenticated.error) {
      setPending(false);
      return setMessage(localizeAuthError(reauthenticated.error, locale));
    }
    const updated = await onUpdatePassword(newPassword);
    setPending(false);
    if (updated.error) return setMessage(localizeAuthError(updated.error, locale));
    setCurrentPassword("");
    setNewPassword("");
    setConfirmation("");
    setMessage(th ? "เปลี่ยนรหัสผ่านแล้ว" : "Password updated");
  }

  return (
    <section className={`${styles.surface} ${styles.profileCard}`}>
      <h2>
        <KeyRound size={18} />
        {th ? "เปลี่ยนรหัสผ่าน" : "Change password"}
      </h2>
      <form onSubmit={submit}>
        <label className={styles.field}>
          {th ? "รหัสผ่านปัจจุบัน" : "Current password"}
          <input
            autoComplete="current-password"
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            type="password"
            value={currentPassword}
          />
        </label>
        <div className={styles.fieldPair}>
          <label className={styles.field}>
            {th ? "รหัสผ่านใหม่" : "New password"}
            <input
              autoComplete="new-password"
              onChange={(event) => setNewPassword(event.target.value)}
              required
              type="password"
              value={newPassword}
            />
          </label>
          <label className={styles.field}>
            {th ? "ยืนยันรหัสผ่านใหม่" : "Confirm new password"}
            <input
              autoComplete="new-password"
              onChange={(event) => setConfirmation(event.target.value)}
              required
              type="password"
              value={confirmation}
            />
          </label>
        </div>
        <p aria-live="polite" className={styles.formMessage} role="status">
          {message}
        </p>
        <div className={styles.profileActions}>
          <button className={styles.goldButton} disabled={pending} type="submit">
            <LockKeyhole size={15} />
            {pending ? (th ? "กำลังอัปเดต…" : "Updating…") : (th ? "อัปเดตรหัสผ่าน" : "Update password")}
          </button>
        </div>
      </form>
    </section>
  );
}

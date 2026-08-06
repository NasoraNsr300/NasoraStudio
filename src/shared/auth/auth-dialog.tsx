"use client";

import { Eye, EyeOff, LockKeyhole, Mail, Sparkles, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import type { Locale } from "@/shared/i18n/locales";

import { localizeAuthError } from "./auth-errors";
import { useAuthSession } from "./auth-session-provider";
import styles from "./auth-dialog.module.css";

type Mode = "signIn" | "signUp";

const copy = {
  en: {
    close: "Close sign in",
    create: "Create account",
    email: "Email",
    emailError: "Enter a valid email address",
    google: "Continue with Google",
    googleUnavailable: "Not available yet",
    haveAccount: "Already have an account?",
    intro: "Access your estimates, messages, payments, and commissioned work.",
    nickname: "Display name",
    nicknameError: "Enter a display name",
    noAccount: "New to Nasora?",
    password: "Password",
    passwordError: "Password must contain at least 8 characters",
    signIn: "Sign in",
    signUp: "Sign up",
    title: "Sign in to Nasora",
    titleSignUp: "Create your Nasora account",
  },
  th: {
    close: "ปิดหน้าเข้าสู่ระบบ",
    create: "สร้างบัญชี",
    email: "อีเมล",
    emailError: "กรุณากรอกอีเมลให้ถูกต้อง",
    google: "ดำเนินการต่อด้วย Google",
    googleUnavailable: "ยังไม่เปิดใช้งาน",
    haveAccount: "มีบัญชีอยู่แล้ว?",
    intro: "เข้าถึงใบประเมิน ข้อความ การชำระเงิน และงานคอมมิชชันของคุณ",
    nickname: "ชื่อที่ใช้แสดง",
    nicknameError: "กรุณากรอกชื่อที่ใช้แสดง",
    noAccount: "ยังไม่มีบัญชี Nasora?",
    password: "รหัสผ่าน",
    passwordError: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
    signIn: "เข้าสู่ระบบ",
    signUp: "สมัครสมาชิก",
    title: "เข้าสู่ระบบ Nasora",
    titleSignUp: "สร้างบัญชี Nasora",
  },
} as const;

export function AuthDialog({ locale, onAuthenticated, onClose }: { locale: Locale; onAuthenticated?(): void; onClose(): void }) {
  const labels = copy[locale];
  const { signIn, signUp } = useAuthSession();
  const [mode, setMode] = useState<Mode>("signIn");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setErrors({});
    setFeedback("");
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const schema = z.object({
      email: z.email(labels.emailError),
      nickname: mode === "signUp" ? z.string().trim().min(1, labels.nicknameError) : z.string().optional(),
      password: z.string().min(8, labels.passwordError),
    });
    const parsed = schema.safeParse({
      email: form.get("email"),
      nickname: form.get("nickname") ?? undefined,
      password: form.get("password"),
    });

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) nextErrors[String(issue.path[0])] ??= issue.message;
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setFeedback("");
    setPending(true);
    const result = mode === "signIn"
      ? await signIn({ email: parsed.data.email, password: parsed.data.password })
      : await signUp({
        email: parsed.data.email,
        options: { data: { nickname: parsed.data.nickname, preferred_locale: locale } },
        password: parsed.data.password,
      });
    setPending(false);
    if (result.error) {
      setFeedback(localizeAuthError(result.error, locale));
      return;
    }
    (onAuthenticated ?? onClose)();
  };

  return <div aria-label={mode === "signIn" ? labels.title : labels.titleSignUp} aria-modal="true" className={styles.backdrop} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} role="dialog">
    <section className={styles.dialog}>
      <button aria-label={labels.close} className={styles.close} onClick={onClose} ref={closeRef} type="button"><X size={21} /></button>
      <header>
        <span className={styles.mark}><Sparkles aria-hidden="true" size={25} /></span>
        <p>NASORA MEMBER</p>
        <h2>{mode === "signIn" ? labels.title : labels.titleSignUp}</h2>
        <span>{labels.intro}</span>
      </header>

      <div aria-label={locale === "th" ? "เลือกประเภทบัญชี" : "Choose authentication mode"} className={styles.tabs} role="tablist">
        <button aria-selected={mode === "signIn"} onClick={() => switchMode("signIn")} role="tab" type="button">{labels.signIn}</button>
        <button aria-selected={mode === "signUp"} onClick={() => switchMode("signUp")} role="tab" type="button">{labels.signUp}</button>
      </div>

      <form noValidate onSubmit={submit}>
        {mode === "signUp" ? <label><span>{labels.nickname}</span><div className={styles.field}><UserRound size={18} /><input aria-invalid={Boolean(errors.nickname)} aria-label={labels.nickname} autoComplete="nickname" name="nickname" /></div>{errors.nickname ? <small role="alert">{errors.nickname}</small> : null}</label> : null}
        <label><span>{labels.email}</span><div className={styles.field}><Mail size={18} /><input aria-invalid={Boolean(errors.email)} aria-label={labels.email} autoComplete="email" inputMode="email" name="email" type="email" /></div>{errors.email ? <small role="alert">{errors.email}</small> : null}</label>
        <label><span>{labels.password}</span><div className={styles.field}><LockKeyhole size={18} /><input aria-invalid={Boolean(errors.password)} aria-label={labels.password} autoComplete={mode === "signIn" ? "current-password" : "new-password"} name="password" type={showPassword ? "text" : "password"} /><button aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)} type="button">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{errors.password ? <small role="alert">{errors.password}</small> : null}</label>
        <p aria-live="polite" className={styles.feedback}>{feedback}</p>
        <button className={styles.submit} disabled={pending} type="submit"><Sparkles size={18} />{mode === "signIn" ? labels.signIn : labels.create}</button>
      </form>

      <div className={styles.divider}><span />{locale === "th" ? "หรือ" : "or"}<span /></div>
      <button aria-label={labels.google} className={styles.google} disabled type="button"><b>G</b><span>{labels.google}</span><small>{labels.googleUnavailable}</small></button>
      <p className={styles.switcher}>{mode === "signIn" ? labels.noAccount : labels.haveAccount} <button onClick={() => switchMode(mode === "signIn" ? "signUp" : "signIn")} type="button">{mode === "signIn" ? labels.signUp : labels.signIn}</button></p>
    </section>
  </div>;
}

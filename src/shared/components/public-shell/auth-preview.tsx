"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { Locale } from "@/shared/i18n/locales";

import styles from "./public-shell.module.css";

type AuthPreviewState = {
  close: () => void;
  open: boolean;
  show: (opener?: HTMLElement | null) => void;
  toggle: (opener?: HTMLElement | null) => void;
};

const AuthPreviewContext = createContext<AuthPreviewState | null>(null);

export function AuthPreviewProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const close = useCallback(() => {
    setOpen(false);
  }, []);
  const show = useCallback((opener?: HTMLElement | null) => {
    openerRef.current = opener ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setOpen(true);
  }, []);
  const toggle = useCallback((opener?: HTMLElement | null) => {
    if (open) close();
    else show(opener);
  }, [close, open, show]);
  const value = useMemo(() => ({ close, open, show, toggle }), [close, open, show, toggle]);

  useEffect(() => {
    if (!open && wasOpenRef.current) openerRef.current?.focus();
    wasOpenRef.current = open;
  }, [open]);

  return <AuthPreviewContext.Provider value={value}>{children}</AuthPreviewContext.Provider>;
}

export function useAuthPreview() {
  const context = useContext(AuthPreviewContext);
  if (!context) throw new Error("useAuthPreview must be used within AuthPreviewProvider");
  return context;
}

const copy = {
  en: { body: "Sign-in will be connected in Stage 2.", close: "Close authentication preview", label: "Authentication preview", title: "Authentication preview" },
  th: { body: "ระบบเข้าสู่ระบบจะเชื่อมต่อใน Stage 2", close: "ปิดตัวอย่างการเข้าสู่ระบบ", label: "ตัวอย่างการเข้าสู่ระบบ", title: "ตัวอย่างการเข้าสู่ระบบ" },
} as const;

export function AuthPreviewPanel({ locale }: { locale: Locale }) {
  const { close } = useAuthPreview();
  const closeRef = useRef<HTMLButtonElement>(null);
  const labels = copy[locale];

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "Tab") {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close]);

  return (
    <section aria-label={labels.label} aria-modal="true" className={styles.accountPanel} lang={locale} role="dialog">
      <strong>{labels.title}</strong>
      <p>{labels.body}</p>
      <button aria-label={labels.close} onClick={close} ref={closeRef} type="button">{labels.close}</button>
    </section>
  );
}

"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { Locale } from "@/shared/i18n/locales";

import styles from "./public-shell.module.css";

type AuthPreviewState = {
  close: () => void;
  open: boolean;
  show: () => void;
  toggle: () => void;
};

const AuthPreviewContext = createContext<AuthPreviewState | null>(null);

export function AuthPreviewProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(
    () => ({ close: () => setOpen(false), open, show: () => setOpen(true), toggle: () => setOpen((value) => !value) }),
    [open],
  );

  return <AuthPreviewContext.Provider value={value}>{children}</AuthPreviewContext.Provider>;
}

export function useAuthPreview() {
  const context = useContext(AuthPreviewContext);
  if (!context) {
    throw new Error("useAuthPreview must be used within AuthPreviewProvider");
  }
  return context;
}

export function AuthPreviewPanel({ locale }: { locale: Locale }) {
  const { close } = useAuthPreview();

  return (
    <section aria-label="Authentication preview" className={styles.accountPanel} lang={locale}>
      <strong>Authentication preview</strong>
      <p>Sign-in will be connected in Stage 2.</p>
      <button onClick={close} type="button">Close preview</button>
    </section>
  );
}

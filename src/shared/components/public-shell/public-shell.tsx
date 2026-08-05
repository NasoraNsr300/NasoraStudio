"use client";

import type { ReactNode } from "react";

import type { Locale } from "@/shared/i18n/locales";

import { AccountButton } from "./account-button";
import { AuthPreviewProvider } from "./auth-preview";
import { FloatingNavbar } from "./floating-navbar";
import styles from "./public-shell.module.css";

export type PublicShellProps = {
  locale: Locale;
  children: ReactNode;
};

export function PublicShell({ children, locale }: PublicShellProps) {
  return (
    <AuthPreviewProvider>
      <div className={styles.shell} lang={locale}>
        <div aria-hidden="true" className={styles.ambient} />
        <FloatingNavbar locale={locale} />
        <div className={styles.pageContent}>{children}</div>
        <AccountButton locale={locale} />
      </div>
    </AuthPreviewProvider>
  );
}

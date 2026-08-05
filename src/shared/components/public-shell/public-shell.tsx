"use client";

import type { ReactNode } from "react";

import type { Locale } from "@/shared/i18n/locales";

import { AccountButton } from "./account-button";
import { AuthPreviewProvider } from "./auth-preview";
import { FloatingNavbar, type SearchConfig } from "./floating-navbar";
import styles from "./public-shell.module.css";

export type { SearchConfig } from "./floating-navbar";

export type PublicShellProps = {
  locale: Locale;
  children: ReactNode;
  search: SearchConfig;
};

export function PublicShell({ children, locale, search }: PublicShellProps) {
  return (
    <AuthPreviewProvider>
      <div className={styles.shell} lang={locale}>
        <div aria-hidden="true" className={styles.ambient} />
        <FloatingNavbar locale={locale} search={search} />
        <div className={styles.pageContent}>{children}</div>
        <AccountButton locale={locale} />
      </div>
    </AuthPreviewProvider>
  );
}

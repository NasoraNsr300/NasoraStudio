"use client";

import type { ReactNode } from "react";

import type { Locale } from "@/shared/i18n/locales";
import { AuthDialogHost, AuthDialogProvider } from "@/shared/auth/auth-dialog-controller";
import { AuthSessionProvider, type AuthClientLike } from "@/shared/auth/auth-session-provider";

import { AccountButton } from "./account-button";
import { FloatingNavbar } from "./floating-navbar";
import { StarryBackground } from "../starry-background/starry-background";
import { AutumnLeavesBackground } from "../autumn-leaves-background/autumn-leaves-background";
import styles from "./public-shell.module.css";

export type PublicShellProps = {
  authClient?: AuthClientLike;
  locale: Locale;
  children: ReactNode;
};

export function PublicShell({ authClient, children, locale }: PublicShellProps) {
  return (
    <AuthSessionProvider client={authClient}>
      <AuthDialogProvider locale={locale}>
        <div className={styles.shell} lang={locale}>
          <StarryBackground />
          <AutumnLeavesBackground />
          <FloatingNavbar locale={locale} />
          <div className={styles.pageContent}>{children}</div>
          <AccountButton locale={locale} />
          <AuthDialogHost locale={locale} />
        </div>
      </AuthDialogProvider>
    </AuthSessionProvider>
  );
}

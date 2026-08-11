"use client";

import type { ReactNode } from "react";

import type { Locale } from "@/shared/i18n/locales";
import { AuthDialogHost, AuthDialogProvider } from "@/shared/auth/auth-dialog-controller";
import { AuthSessionProvider, type AuthClientLike } from "@/shared/auth/auth-session-provider";
import { PublicSiteSettingsProvider } from "@/features/site-settings/components/public-site-settings-provider";
import type { PublicSiteSettings } from "@/features/site-settings/domain/site-settings";

import { AccountButton } from "./account-button";
import { FloatingNavbar } from "./floating-navbar";
import { StarryBackground } from "../starry-background/starry-background";
import { AutumnLeavesBackground } from "../autumn-leaves-background/autumn-leaves-background";
import styles from "./public-shell.module.css";

export type PublicShellProps = {
  authClient?: AuthClientLike;
  locale: Locale;
  children: ReactNode;
  settings?: PublicSiteSettings;
};

export function PublicShell({ authClient, children, locale, settings }: PublicShellProps) {
  return (
    <AuthSessionProvider client={authClient}>
      <AuthDialogProvider locale={locale}>
        <PublicSiteSettingsProvider settings={settings ?? null}>
          <div className={styles.shell} lang={locale}>
            {settings?.particlesEnabled !== false ? <StarryBackground shootingStarsEnabled={settings?.shootingStarsEnabled} /> : null}
            {settings?.particlesEnabled !== false ? <AutumnLeavesBackground /> : null}
            <FloatingNavbar availability={settings?.commissionsOpen === false ? "closed" : "open"} locale={locale} />
            <div className={styles.pageContent}>{children}</div>
            <AccountButton locale={locale} />
            <AuthDialogHost locale={locale} />
          </div>
        </PublicSiteSettingsProvider>
      </AuthDialogProvider>
    </AuthSessionProvider>
  );
}

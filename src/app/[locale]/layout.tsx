import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { PublicShell } from "@/shared/components/public-shell/public-shell";
import { isLocale } from "@/shared/i18n/locales";
import { ThemeScript } from "@/shared/theme/theme-script";
import { getPublicSiteSettings } from "@/features/site-settings/data/public-site-settings-repository.server";

import { notoSansThai, sora } from "../fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: "Nasora",
};

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{ children: ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }
  const settings = await getPublicSiteSettings();

  return (
    <html className={`${sora.variable} ${notoSansThai.variable}`} lang={locale} suppressHydrationWarning>
      <head><ThemeScript /></head>
      <body>
        <PublicShell locale={locale} settings={settings}>
          {children}
        </PublicShell>
      </body>
    </html>
  );
}

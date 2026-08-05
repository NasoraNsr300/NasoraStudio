import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { PublicShell } from "@/shared/components/public-shell/public-shell";
import { isLocale } from "@/shared/i18n/locales";

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{ children: ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <PublicShell locale={locale}>
      {children}
    </PublicShell>
  );
}

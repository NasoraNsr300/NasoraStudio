import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { memberAccessDecision } from "@/shared/auth/return-target";
import { isLocale } from "@/shared/i18n/locales";
import { createClient } from "@/shared/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MemberLayout({
  children,
  params,
}: Readonly<{ children: ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;

  const requestHeaders = await headers();
  const requestedPath = requestHeaders.get("x-nasora-path") ?? `/${locale}/member/requests`;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const decision = memberAccessDecision(data.user, locale, requestedPath);
  if (!decision.allowed) redirect(decision.redirectTo);

  return children;
}

import { NextResponse, type NextRequest } from "next/server";

import { safeAppReturnTarget } from "@/shared/auth/return-target";
import type { Locale } from "@/shared/i18n/locales";
import { createClient } from "@/shared/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const locale: Locale = url.searchParams.get("locale") === "en" ? "en" : "th";
  const target = safeAppReturnTarget(url.searchParams.get("next"), locale);
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(target, url.origin));
  }

  return NextResponse.redirect(new URL(`/${locale}?auth=1&error=callback`, url.origin));
}

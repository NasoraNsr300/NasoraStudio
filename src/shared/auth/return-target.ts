import type { Locale } from "@/shared/i18n/locales";

export function safeMemberReturnTarget(value: string | null | undefined, locale: Locale) {
  const fallback = `/${locale}/member/requests`;
  if (!value || value.startsWith("//") || !value.startsWith(`/${locale}/member/`)) return fallback;

  try {
    const parsed = new URL(value, "https://nasora.local");
    if (parsed.origin !== "https://nasora.local") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function memberAccessDecision(
  user: { id: string } | null,
  locale: Locale,
  requestedPath: string | null | undefined,
): { allowed: true } | { allowed: false; redirectTo: string } {
  if (user) return { allowed: true };
  const target = safeMemberReturnTarget(requestedPath, locale);
  return {
    allowed: false,
    redirectTo: `/${locale}?auth=1&next=${encodeURIComponent(target)}`,
  };
}

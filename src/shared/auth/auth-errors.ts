import type { Locale } from "@/shared/i18n/locales";

export function localizeAuthError(error: { message?: string } | null | undefined, locale: Locale) {
  if (error?.message?.toLowerCase().includes("invalid login")) {
    return locale === "th" ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง" : "Incorrect email or password";
  }

  return locale === "th"
    ? "ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง"
    : "Something went wrong. Please try again";
}

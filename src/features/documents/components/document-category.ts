import type { Locale } from "@/shared/i18n/locales";

const labels = {
  en: { guide: "Guides", privacy: "Privacy", terms: "Terms" },
  th: { guide: "คู่มือ", privacy: "ความเป็นส่วนตัว", terms: "เงื่อนไข" },
} as const;

export function getDocumentCategoryLabel(locale: Locale, category: string) {
  return labels[locale][category as keyof (typeof labels)[Locale]] ?? category;
}

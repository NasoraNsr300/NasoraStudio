import type { Locale } from "@/shared/i18n/locales";

export const dictionaries = {
  th: {
    account: "บัญชี",
    closeMenu: "ปิดเมนู",
    menu: "เปิดเมนู",
    queue: "คิว",
    search: "ค้นหา",
    theme: "เปลี่ยนธีม",
  },
  en: {
    account: "Account",
    closeMenu: "Close menu",
    menu: "Open menu",
    queue: "Queue",
    search: "Search",
    theme: "Change theme",
  },
} as const;

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}

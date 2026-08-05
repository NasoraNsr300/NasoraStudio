import type { Locale } from "@/shared/i18n/locales";

export const dictionaries = {
  th: {
    about: "เกี่ยวกับ",
    account: "บัญชี",
    closeMenu: "ปิดเมนู",
    commission: "คอมมิชชัน",
    documents: "เอกสาร",
    home: "หน้าแรก",
    login: "เข้าสู่ระบบ",
    menu: "เปิดเมนู",
    portfolio: "ผลงาน",
    queue: "คิว",
    search: "ค้นหา",
    theme: "เปลี่ยนธีม",
  },
  en: {
    about: "About",
    account: "Account",
    closeMenu: "Close menu",
    commission: "Commission",
    documents: "Documents",
    home: "Home",
    login: "Log in",
    menu: "Open menu",
    portfolio: "Portfolio",
    queue: "Queue",
    search: "Search",
    theme: "Change theme",
  },
} as const;

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}

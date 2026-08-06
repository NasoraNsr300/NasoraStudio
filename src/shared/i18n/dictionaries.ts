import type { Locale } from "@/shared/i18n/locales";

export type CommissionMessages = {
  albumUnavailable: string;
  backToAlbums: string;
  closeDetails: string;
  closeEstimate: string;
  detailsAndRates: string;
  estimate: string;
  estimatePreview: string;
};

const commissionMessages: Record<Locale, CommissionMessages> = {
  th: {
    albumUnavailable: "อัลบั้มนี้ยังไม่พร้อมแสดงผล",
    backToAlbums: "กลับไปดูทุกอัลบั้ม",
    closeDetails: "ปิดรายละเอียด",
    closeEstimate: "ปิด",
    detailsAndRates: "ดูรายละเอียดและเรทราคา",
    estimate: "ประเมินราคา",
    estimatePreview: "กรอกข้อมูลเพื่อส่งแบบประเมินราคา",
  },
  en: {
    albumUnavailable: "This album is not available yet",
    backToAlbums: "Back to all albums",
    closeDetails: "Close details",
    closeEstimate: "Close",
    detailsAndRates: "View Details & Rates",
    estimate: "Request Estimate",
    estimatePreview: "Complete the form to request an estimate",
  },
};

export const dictionaries = {
  th: {
    about: "เกี่ยวกับ",
    account: "บัญชี",
    closeMenu: "ปิดเมนู",
    commission: commissionMessages.th,
    commissionNav: "คอมมิชชัน",
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
    commission: commissionMessages.en,
    commissionNav: "Commission",
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

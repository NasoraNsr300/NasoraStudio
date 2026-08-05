"use client";

import type { Locale } from "@/shared/i18n/locales";
import type { PortfolioItem } from "@/shared/types/public-content";

import { PortfolioGallery } from "./portfolio-gallery";
import styles from "./portfolio.module.css";

export type PortfolioPageProps = {
  initialCategory?: string | null;
  initialQuery?: string | null;
  initialWork?: string | null;
  items: PortfolioItem[];
  locale: Locale;
};

export function PortfolioPage({ initialCategory, initialQuery, initialWork, items, locale }: PortfolioPageProps) {
  return (
    <main className={styles.portfolio}>
      <header className={styles.heading}>
        <p>{locale === "th" ? "ผลงาน" : "Selected work"}</p>
        <h1>{locale === "th" ? "พอร์ตโฟลิโอ" : "Portfolio"}</h1>
        <span>{locale === "th" ? "เลือกดูผลงานเพื่อเปิดภาพเต็ม" : "Choose an artwork to view it in full."}</span>
      </header>
      <PortfolioGallery initialCategory={initialCategory} initialQuery={initialQuery} initialWork={initialWork} items={items} locale={locale} />
    </main>
  );
}

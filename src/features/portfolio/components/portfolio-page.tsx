"use client";

import type { Locale } from "@/shared/i18n/locales";
import type { PublicPortfolioItem } from "@/features/portfolio/domain/portfolio";

import { PortfolioGallery } from "./portfolio-gallery";
import styles from "./portfolio.module.css";

export type PortfolioPageProps = {
  initialCategory?: string | null;
  initialQuery?: string | null;
  initialWork?: string | null;
  items: PublicPortfolioItem[];
  locale: Locale;
};

export function PortfolioPage({ initialCategory, initialQuery, initialWork, items, locale }: PortfolioPageProps) {
  return <main className={styles.portfolio}>
    <header className={styles.heading}>
      <h1>PORTFOLIO <span>—</span> <strong>{locale === "th" ? "ผลงาน" : "Works"}</strong></h1>
      <i aria-hidden="true" />
      <p>{locale === "th" ? "รวมผลงานที่สร้างสรรค์ด้วยความตั้งใจ ถ่ายทอดจินตนาการผ่านภาพ แสง และเรื่องราวในสไตล์อันเป็นเอกลักษณ์" : "A collection of carefully crafted work, bringing imagination to life through light, imagery, and story."}</p>
    </header>
    <PortfolioGallery initialCategory={initialCategory} initialQuery={initialQuery} initialWork={initialWork} items={items} locale={locale} />
  </main>;
}

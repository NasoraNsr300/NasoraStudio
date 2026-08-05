import type { Locale } from "@/shared/i18n/locales";
import type { ServiceCategory } from "@/shared/types/public-content";

import { AlbumTile } from "./album-tile";
import styles from "./commission.module.css";

export type CommissionAlbumsPageProps = {
  categories: ServiceCategory[];
  locale: Locale;
};

const copy = {
  en: {
    description: "Choose an album to browse available commission types and their guidance.",
    eyebrow: "Commission catalog",
    title: "Commission albums",
  },
  th: {
    description: "เลือกอัลบั้มเพื่อดูรูปแบบงานและรายละเอียด",
    eyebrow: "รายการคอมมิชชัน",
    title: "อัลบั้มคอมมิชชัน",
  },
} as const;

export function CommissionAlbumsPage({ categories, locale }: CommissionAlbumsPageProps) {
  const sortedCategories = [...categories].sort((left, right) => left.displayOrder - right.displayOrder);
  const labels = copy[locale];

  return (
    <main className={styles.commissionPage}>
      <header className={styles.heading}>
        <p>{labels.eyebrow}</p>
        <h1>{labels.title}</h1>
        <span>{labels.description}</span>
      </header>
      <section aria-label={labels.title} className={styles.albumGrid}>
        {sortedCategories.map((category, index) => <AlbumTile category={category} eager={index === 0} key={category.slug} locale={locale} />)}
      </section>
    </main>
  );
}

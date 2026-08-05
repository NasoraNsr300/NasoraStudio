import type { Locale } from "@/shared/i18n/locales";
import type { ServiceCategory } from "@/shared/types/public-content";

import { AlbumTile } from "./album-tile";
import styles from "./commission.module.css";

export type CommissionAlbumsPageProps = {
  categories: ServiceCategory[];
  locale: Locale;
};

export function CommissionAlbumsPage({ categories, locale }: CommissionAlbumsPageProps) {
  const sortedCategories = [...categories].sort((left, right) => left.displayOrder - right.displayOrder);

  return (
    <main className={styles.commissionPage}>
      <header className={styles.heading}>
        <p>{locale === "en" ? "Commission catalog" : "à¸£à¸²à¸¢à¸à¸²à¸£à¸„à¸­à¸¡à¸¡à¸´à¸Šà¸Šà¸±à¸™"}</p>
        <h1>{locale === "en" ? "Commission albums" : "à¸­à¸±à¸¥à¸šà¸±à¹‰à¸¡à¸„à¸­à¸¡à¸¡à¸´à¸Šà¸Šà¸±à¸™"}</h1>
        <span>{locale === "en" ? "Choose an album to browse available commission types and their guidance." : "à¹€à¸¥à¸·à¸­à¸à¸­à¸±à¸¥à¸šà¸±à¹‰à¸¡à¹€à¸žà¸·à¹ˆà¸­à¸”à¸¹à¸£à¸¹à¸›à¹à¸šà¸šà¸‡à¸²à¸™à¹à¸¥à¸°à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”"}</span>
      </header>
      <section aria-label={locale === "en" ? "Commission albums" : "à¸­à¸±à¸¥à¸šà¸±à¹‰à¸¡à¸„à¸­à¸¡à¸¡à¸´à¸Šà¸Šà¸±à¸™"} className={styles.albumGrid}>
        {sortedCategories.map((category, index) => <AlbumTile category={category} eager={index < 4} key={category.slug} locale={locale} />)}
      </section>
    </main>
  );
}

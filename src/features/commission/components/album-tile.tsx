import Image from "next/image";
import Link from "next/link";

import type { Locale } from "@/shared/i18n/locales";
import type { ServiceCategory } from "@/shared/types/public-content";

import styles from "./commission.module.css";

export type AlbumTileProps = {
  category: ServiceCategory;
  locale?: Locale;
};

const availabilityCopy: Record<Locale, Record<ServiceCategory["availability"], string>> = {
  en: { open: "Open", limited: "Limited", closed: "Closed" },
  th: { open: "à¹€à¸›à¸´à¸”à¸£à¸±à¸š", limited: "à¸£à¸±à¸šà¸ˆà¸³à¸à¸±à¸”", closed: "à¸›à¸´à¸”à¸£à¸±à¸š" },
};

export function AlbumTile({ category, locale = "en" }: AlbumTileProps) {
  const countLabel = locale === "en" ? `${category.typeCount} ${category.typeCount === 1 ? "type" : "types"}` : `${category.typeCount} à¸£à¸¹à¸›à¹à¸šà¸š`;
  const viewLabel = locale === "en" ? `View ${category.name.en} album` : `à¸”à¸¹à¸­à¸±à¸¥à¸šà¸±à¹‰à¸¡ ${category.name.th}`;

  return (
    <Link aria-label={viewLabel} className={styles.albumTile} href={`/${locale}/commission/${category.slug}`}>
      <Image
        alt={category.coverMedia.alt[locale]}
        fill
        sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, (max-width: 1180px) 33vw, 25vw"
        src={category.coverMedia.cardSrc}
        style={{ objectPosition: category.coverCrop.objectPosition }}
      />
      <span className={styles.albumGradient} />
      {category.recommended ? <span className={styles.recommendedBadge}>Recommended</span> : null}
      <span className={`${styles.availabilityBadge} ${styles[category.availability]}`}>{availabilityCopy[locale][category.availability]}</span>
      <span className={styles.albumTitle}>{category.name[locale]}</span>
      <span className={styles.countPill}>{countLabel}</span>
    </Link>
  );
}

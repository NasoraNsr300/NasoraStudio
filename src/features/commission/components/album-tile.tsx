import type { Locale } from "@/shared/i18n/locales";
import type { ServiceCategory } from "@/shared/types/public-content";
import { ResponsiveMedia } from "@/shared/components/media/responsive-media";

import styles from "./commission.module.css";

export type AlbumTileProps = {
  category: ServiceCategory;
  eager?: boolean;
  locale?: Locale;
  onSelect?(): void;
};

const availabilityCopy: Record<Locale, Record<ServiceCategory["availability"], string>> = {
  en: { open: "Open", limited: "Limited", closed: "Closed" },
  th: { open: "เปิดรับ", limited: "รับจำนวนจำกัด", closed: "ปิดรับ" },
};

const albumCopy: Record<Locale, { recommended: string; typeCount: (count: number) => string; view: (name: string) => string }> = {
  en: { recommended: "Recommended", typeCount: (count) => `${count} ${count === 1 ? "type" : "types"}`, view: (name) => `View ${name} album` },
  th: { recommended: "แนะนำ", typeCount: (count) => `${count} รูปแบบ`, view: (name) => `ดูอัลบั้ม ${name}` },
};

export function AlbumTile({ category, eager = false, locale = "en", onSelect }: AlbumTileProps) {
  const copy = albumCopy[locale];
  const countLabel = copy.typeCount(category.typeCount);
  const viewLabel = copy.view(category.name[locale]);

  return (
    <button aria-label={viewLabel} className={styles.albumTile} onClick={onSelect} type="button">
      {category.coverMedia ? (
        <ResponsiveMedia
          className={styles.albumMedia}
          crop={category.coverCrop}
          locale={locale}
          media={category.coverMedia}
          priority={eager}
          sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, (max-width: 1180px) 33vw, 25vw"
        />
      ) : <span aria-hidden="true" className={styles.albumMediaPlaceholder} data-catalog-cover="empty" />}
      <span className={styles.albumGradient} />
      {category.recommended ? <span className={styles.recommendedBadge}>{copy.recommended}</span> : null}
      <span className={`${styles.availabilityBadge} ${styles[category.availability]}`}>{availabilityCopy[locale][category.availability]}</span>
      <span className={styles.albumTitle}>{category.name[locale]}</span>
      <span className={styles.countPill}>{countLabel}</span>
    </button>
  );
}

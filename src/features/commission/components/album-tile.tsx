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

const fallbackCoverMedia = {
  alt: { en: "Nasora Studio sample artwork", th: "ภาพตัวอย่าง Nasora Studio" },
  cardSrc: "/fixtures/derivatives/violet-card.webp",
  detailSrc: "/fixtures/derivatives/violet-detail.webp",
  height: 1500,
  id: "nasora-catalog-fallback",
  kind: "image" as const,
  thumbnailSrc: "/fixtures/derivatives/violet-thumbnail.webp",
  width: 1200,
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
      ) : (
        <span aria-hidden="true" data-catalog-cover="fallback">
          <ResponsiveMedia
            className={styles.albumMedia}
            crop={{ aspectRatio: "4 / 5", objectPosition: "50% 45%" }}
            locale={locale}
            media={fallbackCoverMedia}
            priority={eager}
            sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, (max-width: 1180px) 33vw, 25vw"
          />
        </span>
      )}
      <span className={styles.albumGradient} />
      {category.recommended ? <span className={styles.recommendedBadge}>{copy.recommended}</span> : null}
      <span className={`${styles.availabilityBadge} ${styles[category.availability]}`}>{availabilityCopy[locale][category.availability]}</span>
      <span className={styles.albumTitle}>{category.name[locale]}</span>
      <span className={styles.countPill}>{countLabel}</span>
    </button>
  );
}

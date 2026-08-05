"use client";

import type { CSSProperties } from "react";

import type { Locale } from "@/shared/i18n/locales";
import type { FeaturedItem } from "@/shared/types/public-content";

import styles from "./home.module.css";

export type FeaturedCarouselProps = {
  items: FeaturedItem[];
  locale?: Locale;
  secondsPerItem?: number;
};

const carouselCopy = {
  en: {
    label: "Featured work",
    selected: "SELECTED PIECES",
    title: "Featured work",
    view: (title: string) => `View ${title}`,
  },
  th: {
    label: "ผลงานแนะนำ",
    selected: "ผลงานที่คัดสรร",
    title: "ผลงานเด่น",
    view: (title: string) => `ดู ${title}`,
  },
} as const;

type FeaturedGroupProps = {
  ariaHidden?: boolean;
  items: FeaturedItem[];
  locale: Locale;
};

function FeaturedGroup({ ariaHidden = false, items, locale }: FeaturedGroupProps) {
  const copy = carouselCopy[locale];

  return (
    <div
      aria-hidden={ariaHidden || undefined}
      className={styles.loopGroup}
      data-testid="featured-loop-group"
    >
      {items.map((item, index) => (
        <a
          aria-label={copy.view(item.title[locale])}
          className={styles.loopCard}
          href={`/${locale}${item.destination}`}
          key={`${ariaHidden ? "duplicate" : "primary"}-${item.id}-${index}`}
          tabIndex={ariaHidden ? -1 : undefined}
        >
          <span className={styles.loopMedia}>
            {/* Public grids use stored derivatives and never Worker-side transforms. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={ariaHidden ? "" : item.media.alt[locale]}
              height={item.media.height}
              loading="lazy"
              sizes="(min-width: 1024px) 20vw, 44vw"
              src={item.media.cardSrc}
              srcSet={`${item.media.thumbnailSrc} 480w, ${item.media.cardSrc} 960w, ${item.media.detailSrc} 1600w`}
              style={{ objectPosition: item.crop.objectPosition }}
              width={item.media.width}
            />
          </span>
          <span aria-hidden="true" className={styles.loopMark}>✦</span>
        </a>
      ))}
    </div>
  );
}

export function FeaturedCarousel({
  items,
  locale = "en",
  secondsPerItem = 6,
}: FeaturedCarouselProps) {
  const copy = carouselCopy[locale];

  if (items.length === 0) return null;

  const renderItems = items.length >= 4
    ? items
    : Array.from({ length: 4 }, (_, index) => items[index % items.length]);
  const durationSeconds = Math.max(renderItems.length * secondsPerItem, 24);
  const trackStyle = { "--loop-duration": `${durationSeconds}s` } as CSSProperties;

  return (
    <section
      aria-label={copy.label}
      className={styles.carousel}
      role="region"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>{copy.selected}</p>
          <h2 id="featured-work">{copy.title}</h2>
        </div>
      </div>
      <div className={styles.loopViewport} data-testid="featured-loop-viewport" data-visible-count="4">
        <div
          className={styles.loopTrack}
          data-testid="featured-loop-track"
          style={trackStyle}
        >
          <FeaturedGroup items={renderItems} locale={locale} />
          <FeaturedGroup ariaHidden items={renderItems} locale={locale} />
        </div>
      </div>
    </section>
  );
}

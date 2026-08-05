"use client";

import type { CSSProperties, FocusEvent } from "react";
import { useEffect, useState } from "react";

import type { Locale } from "@/shared/i18n/locales";
import type { FeaturedItem } from "@/shared/types/public-content";

import styles from "./home.module.css";

export type FeaturedCarouselProps = {
  items: FeaturedItem[];
  locale?: Locale;
  secondsPerItem?: number;
};

type PauseReason = "focus" | "hover" | "manual" | "motion" | "visibility";

const carouselCopy = {
  en: {
    label: "Featured work",
    pause: "Pause featured artwork",
    play: "Play featured artwork",
    selected: "SELECTED PIECES",
    title: "Featured work",
    view: (title: string) => `View ${title}`,
  },
  th: {
    label: "ผลงานแนะนำ",
    pause: "หยุดผลงานเด่น",
    play: "เล่นผลงานเด่น",
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
  const [pauseReasons, setPauseReasons] = useState<Set<PauseReason>>(() => new Set());
  const copy = carouselCopy[locale];

  const setPaused = (reason: PauseReason, paused: boolean) => {
    setPauseReasons((current) => {
      const next = new Set(current);
      if (paused) next.add(reason);
      else next.delete(reason);
      return next;
    });
  };

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;

    const updateMotionPreference = () => setPaused("motion", query.matches);
    updateMotionPreference();
    query.addEventListener?.("change", updateMotionPreference);
    return () => query.removeEventListener?.("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    const updateVisibility = () => setPaused("visibility", document.visibilityState === "hidden");
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  if (items.length === 0) return null;

  const renderItems = items.length >= 4
    ? items
    : Array.from({ length: 4 }, (_, index) => items[index % items.length]);
  const durationSeconds = Math.max(renderItems.length * secondsPerItem, 24);
  const isPaused = pauseReasons.size > 0;
  const manualPaused = pauseReasons.has("manual");
  const trackStyle = { "--loop-duration": `${durationSeconds}s` } as CSSProperties;

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setPaused("focus", false);
  };

  return (
    <section
      aria-label={copy.label}
      className={styles.carousel}
      onBlur={handleBlur}
      onFocus={() => setPaused("focus", true)}
      onPointerEnter={() => setPaused("hover", true)}
      onPointerLeave={() => setPaused("hover", false)}
      role="region"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>{copy.selected}</p>
          <h2 id="featured-work">{copy.title}</h2>
        </div>
        <button
          aria-label={manualPaused ? copy.play : copy.pause}
          className={styles.motionToggle}
          onClick={() => setPaused("manual", !manualPaused)}
          type="button"
        >
          <span aria-hidden="true">{manualPaused ? "▶" : "Ⅱ"}</span>
        </button>
      </div>
      <div className={styles.loopViewport} data-testid="featured-loop-viewport" data-visible-count="4">
        <div
          className={styles.loopTrack}
          data-paused={isPaused}
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

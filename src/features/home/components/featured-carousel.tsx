"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

import type { Locale } from "@/shared/i18n/locales";
import type { FeaturedItem } from "@/shared/types/public-content";

import styles from "./home.module.css";

export type FeaturedCarouselProps = {
  items: FeaturedItem[];
  intervalMs?: number;
  locale?: Locale;
};

type PauseReason = "focus" | "hover" | "manual" | "motion" | "visibility";

const DEFAULT_INTERVAL_MS = 7000;

export function FeaturedCarousel({
  items,
  intervalMs = DEFAULT_INTERVAL_MS,
  locale = "en",
}: FeaturedCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [pauseReasons, setPauseReasons] = useState<Set<PauseReason>>(() => new Set());
  const [announcePosition, setAnnouncePosition] = useState(false);
  const isPaused = pauseReasons.size > 0;
  const activeItem = items[activeIndex];

  const setPaused = (reason: PauseReason, paused: boolean) => {
    setPauseReasons((current) => {
      const next = new Set(current);
      if (paused) next.add(reason);
      else next.delete(reason);
      return next;
    });
  };

  const move = (direction: -1 | 1, manual = false) => {
    if (items.length === 0) return;
    if (manual) {
      setPaused("manual", true);
      setAnnouncePosition(true);
    }
    setActiveIndex((current) => (current + direction + items.length) % items.length);
  };

  const moveTo = (index: number) => {
    setPaused("manual", true);
    setAnnouncePosition(true);
    setActiveIndex(index);
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

  useEffect(() => {
    if (items.length < 2 || isPaused) return;
    const timer = window.setInterval(() => {
      setAnnouncePosition(false);
      setActiveIndex((current) => (current + 1) % items.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, isPaused, items.length]);

  if (items.length === 0) return null;

  return (
    <section
      aria-label="Featured work"
      className={styles.carousel}
      onFocus={(event) => {
        if (event.currentTarget.contains(event.target)) setPaused("focus", true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused("focus", false);
      }}
      onPointerEnter={() => setPaused("hover", true)}
      onPointerLeave={() => setPaused("hover", false)}
      role="region"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>SELECTED PIECES</p>
          <h2 id="featured-work">Featured work</h2>
        </div>
        <span aria-atomic="true" aria-live={announcePosition ? "polite" : "off"} aria-label={`${activeIndex + 1} / ${items.length}`} className={styles.position}>
          {activeIndex + 1} / {items.length}
        </span>
      </div>
      <article className={styles.featuredCard}>
        <div className={styles.featuredMedia} style={{ "--featured-aspect-ratio": activeItem.crop.aspectRatio } as CSSProperties}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={activeItem.media.alt[locale]}
            height={activeItem.media.height}
            loading="lazy"
            src={activeItem.media.cardSrc}
            style={{ objectPosition: activeItem.crop.objectPosition }}
            width={activeItem.media.width}
          />
        </div>
        <div className={styles.featuredCopy}>
          <p className={styles.eyebrow}>FEATURED {String(activeIndex + 1).padStart(2, "0")}</p>
          <h3>{activeItem.title[locale]}</h3>
          <p>{activeItem.description[locale]}</p>
          <a href={activeItem.destination}>View this work</a>
        </div>
      </article>
      <div aria-label="Featured work controls" className={styles.carouselControls}>
        <button aria-label="Previous featured work" onClick={() => move(-1, true)} type="button">Previous</button>
        <div aria-label="Featured work positions" className={styles.positionControls}>
          {items.map((item, index) => (
            <button
              aria-current={activeIndex === index ? "true" : undefined}
              aria-label={`Show featured work ${index + 1}`}
              className={styles.positionControl}
              key={item.id}
              onClick={() => moveTo(index)}
              type="button"
            />
          ))}
        </div>
        <button aria-label="Next featured work" onClick={() => move(1, true)} type="button">Next</button>
      </div>
    </section>
  );
}

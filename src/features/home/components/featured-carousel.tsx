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

const carouselCopy = {
  en: { controls: "Featured work controls", featured: "FEATURED", label: "Featured work", next: "Next", nextLabel: "Next featured work", positions: "Featured work positions", previous: "Previous", previousLabel: "Previous featured work", selected: "SELECTED PIECES", show: (index: number) => `Show featured work ${index}`, title: "Featured work", view: "View this work" },
  th: { controls: "ตัวควบคุมผลงานแนะนำ", featured: "แนะนำ", label: "ผลงานแนะนำ", next: "ถัดไป", nextLabel: "ผลงานถัดไป", positions: "ตำแหน่งผลงานแนะนำ", previous: "ก่อนหน้า", previousLabel: "ผลงานก่อนหน้า", selected: "ผลงานที่คัดสรร", show: (index: number) => `แสดงผลงานแนะนำชิ้นที่ ${index}`, title: "ผลงานแนะนำ", view: "ดูผลงานนี้" },
} as const;

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
  const copy = carouselCopy[locale];

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
      aria-label={copy.label}
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
          <p className={styles.eyebrow}>{copy.selected}</p>
          <h2 id="featured-work">{copy.title}</h2>
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
          <p className={styles.eyebrow}>{copy.featured} {String(activeIndex + 1).padStart(2, "0")}</p>
          <h3>{activeItem.title[locale]}</h3>
          <p>{activeItem.description[locale]}</p>
          <a href={`/${locale}${activeItem.destination}`}>{copy.view}</a>
        </div>
      </article>
      <div aria-label={copy.controls} className={styles.carouselControls}>
        <button aria-label={copy.previousLabel} onClick={() => move(-1, true)} type="button">{copy.previous}</button>
        <div aria-label={copy.positions} className={styles.positionControls}>
          {items.map((item, index) => (
            <button
              aria-current={activeIndex === index ? "true" : undefined}
              aria-label={copy.show(index + 1)}
              className={styles.positionControl}
              key={item.id}
              onClick={() => moveTo(index)}
              type="button"
            />
          ))}
        </div>
        <button aria-label={copy.nextLabel} onClick={() => move(1, true)} type="button">{copy.next}</button>
      </div>
    </section>
  );
}

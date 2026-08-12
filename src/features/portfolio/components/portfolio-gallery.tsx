"use client";
/* eslint-disable @next/next/no-img-element -- private R2 media is served through signed redirect routes */

import { Sparkles } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";

import type { PublicPortfolioItem } from "@/features/portfolio/domain/portfolio";
import type { Locale } from "@/shared/i18n/locales";

import { ImageLightbox } from "./image-lightbox";
import { portfolioTileWidth } from "./portfolio-layout";
import styles from "./portfolio.module.css";

export type PortfolioGalleryProps = {
  initialCategory?: string | null;
  initialQuery?: string | null;
  initialWork?: string | null;
  items: PublicPortfolioItem[];
  locale: Locale;
};

const copy = {
  en: { all: "All", categories: "Portfolio categories", empty: "No portfolio work matches that search.", view: "View" },
  th: { all: "ทั้งหมด", categories: "หมวดหมู่ผลงาน", empty: "ไม่พบผลงานที่ตรงกับคำค้น", view: "ดู" },
} as const;

function normalize(value: string | null | undefined, locale: Locale) {
  return value?.trim().toLocaleLowerCase(locale) ?? "";
}

export function PortfolioGallery({ initialCategory, initialQuery, initialWork, items, locale }: PortfolioGalleryProps) {
  const categories = useMemo(() => Array.from(new Map(items.map((item) => [item.category, item.categoryName])).entries()), [items]);
  const requested = categories.some(([slug]) => normalize(slug, locale) === normalize(initialCategory, locale)) ? normalize(initialCategory, locale) : "all";
  return <PortfolioGalleryContent categories={categories} initialCategory={requested} initialQuery={initialQuery} initialWork={initialWork} items={items} key={`${requested}-${initialQuery ?? ""}-${initialWork ?? ""}`} locale={locale} />;
}

function PortfolioGalleryContent({ categories, initialCategory, initialQuery, initialWork, items, locale }: PortfolioGalleryProps & { categories: Array<[string, { en: string; th: string }]>; initialCategory: string }) {
  const text = copy[locale];
  const [category, setCategory] = useState(initialCategory);
  const [selectedItem, setSelectedItem] = useState<PublicPortfolioItem | null>(() => items.find((item) => item.id === initialWork) ?? null);
  const visibleItems = useMemo(() => items.filter((item) => category === "all" || item.category === category).filter((item) => {
    const query = normalize(initialQuery, locale);
    return !query || [item.title[locale], item.categoryName[locale]].some((value) => normalize(value, locale).includes(query));
  }), [category, initialQuery, items, locale]);

  return <>
    <div aria-label={text.categories} className={styles.categoryFilters}>
      <button aria-pressed={category === "all"} onClick={() => setCategory("all")} type="button"><Sparkles size={17} />{text.all}</button>
      {categories.map(([slug, label]) => <button aria-pressed={category === slug} key={slug} onClick={() => setCategory(slug)} type="button"><Sparkles size={16} />{label[locale]}</button>)}
    </div>
    <div className={styles.gallery}>
      {visibleItems.map((item, index) => <button aria-label={`${text.view} ${item.title[locale]}`} className={`${styles.card} ${styles[portfolioTileWidth({ ...item.media, id: item.id })]}`} key={item.id} onClick={() => setSelectedItem(item)} style={{ "--portfolio-aspect-ratio": `${item.media.width} / ${item.media.height}` } as CSSProperties} type="button">
        <img alt={item.media.alt[locale]} className={styles.cardMedia} decoding="async" fetchPriority={index === 0 ? "high" : "auto"} height={item.media.height} loading={index === 0 ? "eager" : "lazy"} src={item.media.cardSrc} width={item.media.width} />
        <span className={styles.cardOverlay}><strong>{item.title[locale]}</strong></span>
      </button>)}
    </div>
    {!visibleItems.length ? <p className={styles.empty} role="status">{text.empty}</p> : null}
    <ImageLightbox item={selectedItem} locale={locale} onClose={() => setSelectedItem(null)} />
  </>;
}

"use client";

import { Grid2X2, List, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { ResponsiveMedia } from "@/shared/components/media/responsive-media";
import type { Locale } from "@/shared/i18n/locales";
import type { PortfolioItem } from "@/shared/types/public-content";

import { ImageLightbox } from "./image-lightbox";
import styles from "./portfolio.module.css";

export type PortfolioGalleryProps = {
  initialCategory?: string | null;
  initialQuery?: string | null;
  initialWork?: string | null;
  items: PortfolioItem[];
  locale: Locale;
};

type SortOrder = "newest" | "featured";
type ViewMode = "grid" | "list";

const galleryCopy = {
  en: { all: "All", categories: "Portfolio categories", empty: "No portfolio work matches that search.", featured: "Featured", newest: "Newest", sort: "Sort artwork", view: "View", viewMode: "View mode" },
  th: { all: "ทั้งหมด", categories: "หมวดหมู่ผลงาน", empty: "ไม่พบผลงานที่ตรงกับคำค้น", featured: "ผลงานแนะนำ", newest: "ล่าสุด", sort: "เรียงผลงาน", view: "ดู", viewMode: "รูปแบบการแสดงผล" },
} as const;

const knownCategoryLabels: Record<string, Record<Locale, string>> = {
  character: { th: "ตัวละคร", en: "Character" },
  illustration: { th: "ภาพประกอบ", en: "Illustration" },
  motion: { th: "แอนิเมชัน", en: "Motion" },
};

function normalize(value: string | null | undefined, locale: Locale) {
  return value?.trim().toLocaleLowerCase(locale) ?? "";
}

function categoryLabel(category: string, locale: Locale) {
  return knownCategoryLabels[category]?.[locale] ?? category.split("-").map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`).join(" ");
}

export function PortfolioGallery({ initialCategory, initialQuery, initialWork, items, locale }: PortfolioGalleryProps) {
  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category))).sort(), [items]);
  const requestedCategory = useMemo(() => categories.find((value) => normalize(value, locale) === normalize(initialCategory, locale)) ?? "all", [categories, initialCategory, locale]);

  return <PortfolioGalleryContent categories={categories} initialCategory={requestedCategory} initialQuery={initialQuery} initialWork={initialWork} items={items} key={`${requestedCategory}-${initialQuery ?? ""}-${initialWork ?? ""}`} locale={locale} />;
}

type PortfolioGalleryContentProps = Omit<PortfolioGalleryProps, "initialCategory"> & { categories: string[]; initialCategory: string };

function PortfolioGalleryContent({ categories, initialCategory, initialQuery, initialWork, items, locale }: PortfolioGalleryContentProps) {
  const copy = galleryCopy[locale];
  const [category, setCategory] = useState(initialCategory);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(() => items.find((item) => item.id === `portfolio-${initialWork}` || item.id === initialWork) ?? null);

  const visibleItems = useMemo(() => items
    .filter((item) => category === "all" || item.category === category)
    .filter((item) => {
      const query = normalize(initialQuery, locale);
      return !query || [item.title[locale], item.description[locale], item.category].some((value) => normalize(value, locale).includes(query));
    })
    .sort((left, right) => sortOrder === "featured" ? Number(right.featured) - Number(left.featured) || left.displayOrder - right.displayOrder : left.displayOrder - right.displayOrder), [category, initialQuery, items, locale, sortOrder]);

  return <>
    <div className={styles.controls}>
      <div aria-label={copy.categories} className={styles.categoryFilters}>
        <button aria-pressed={category === "all"} onClick={() => setCategory("all")} type="button"><Sparkles size={17} />{copy.all}</button>
        {categories.map((value) => <button aria-pressed={category === value} key={value} onClick={() => setCategory(value)} type="button"><Sparkles size={16} />{categoryLabel(value, locale)}</button>)}
      </div>
      <div className={styles.galleryTools}>
        <div aria-label={copy.viewMode} className={styles.viewMode}>
          <button aria-label="Grid" aria-pressed={viewMode === "grid"} onClick={() => setViewMode("grid")} type="button"><Grid2X2 size={18} /></button>
          <button aria-label="List" aria-pressed={viewMode === "list"} onClick={() => setViewMode("list")} type="button"><List size={18} /></button>
        </div>
        <label className={styles.sortControl}><Sparkles size={17} /><select aria-label={copy.sort} onChange={(event) => setSortOrder(event.target.value as SortOrder)} value={sortOrder}><option value="newest">{copy.newest}</option><option value="featured">{copy.featured}</option></select></label>
      </div>
    </div>

    <div className={`${styles.gallery} ${viewMode === "list" ? styles.listGallery : ""}`}>
      {visibleItems.map((item) => <button aria-label={`${copy.view} ${item.title[locale]}`} className={`${styles.card} ${styles[item.crop.gridSpan]}`} key={item.id} onClick={() => setSelectedItem(item)} type="button">
        <ResponsiveMedia className={styles.cardMedia} crop={item.crop} locale={locale} media={item.media} sizes="(max-width: 520px) 100vw, (max-width: 780px) 50vw, 33vw" />
        <span className={styles.cardOverlay}><span>{categoryLabel(item.category, locale)}</span><strong>{item.title[locale]}</strong></span>
      </button>)}
    </div>
    {!visibleItems.length ? <p className={styles.empty} role="status">{copy.empty}</p> : null}
    <ImageLightbox item={selectedItem} locale={locale} onClose={() => setSelectedItem(null)} />
  </>;
}

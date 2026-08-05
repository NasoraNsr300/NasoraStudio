"use client";

import { useMemo, useState } from "react";

import type { Locale } from "@/shared/i18n/locales";
import type { PortfolioItem } from "@/shared/types/public-content";
import { ResponsiveMedia } from "@/shared/components/media/responsive-media";

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

type GalleryCopy = {
  all: string;
  categories: string;
  featured: string;
  newest: string;
  sort: string;
  view: string;
  empty: string;
};

const galleryCopy: Record<Locale, GalleryCopy> = {
  en: { all: "All work", categories: "Portfolio categories", empty: "No portfolio work matches that search.", featured: "Featured", newest: "Newest", sort: "Sort artwork", view: "View" },
  th: { all: "ทั้งหมด", categories: "หมวดหมู่ผลงาน", empty: "ไม่พบผลงานที่ตรงกับคำค้น", featured: "ผลงานแนะนำ", newest: "ล่าสุด", sort: "เรียงผลงาน", view: "ดู" },
};

const thaiCategoryLabels: Record<string, string> = {
  character: "คาแรกเตอร์",
  illustration: "ภาพประกอบ",
  motion: "แอนิเมชัน",
};

function normalize(value: string | null | undefined, locale: Locale) {
  return value?.trim().toLocaleLowerCase(locale) ?? "";
}

function categoryLabel(category: string, locale: Locale) {
  return locale === "th" ? (thaiCategoryLabels[category] ?? category) : `${category.slice(0, 1).toUpperCase()}${category.slice(1)}`;
}

export function PortfolioGallery({ initialCategory, initialQuery, initialWork, items, locale }: PortfolioGalleryProps) {
  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category))).sort(),
    [items],
  );
  const requestedCategory = useMemo(
    () => categories.find((value) => normalize(value, locale) === normalize(initialCategory, locale)) ?? "all",
    [categories, initialCategory, locale],
  );

  return (
    <PortfolioGalleryContent
      categories={categories}
      initialCategory={requestedCategory}
      initialQuery={initialQuery}
      initialWork={initialWork}
      items={items}
      key={`${requestedCategory}-${initialQuery ?? ""}-${initialWork ?? ""}`}
      locale={locale}
    />
  );
}

type PortfolioGalleryContentProps = Omit<PortfolioGalleryProps, "initialCategory"> & {
  categories: string[];
  initialCategory: string;
};

function PortfolioGalleryContent({ categories, initialCategory, initialQuery, initialWork, items, locale }: PortfolioGalleryContentProps) {
  const copy = galleryCopy[locale];
  const [category, setCategory] = useState(initialCategory);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(() => (
    items.find((item) => item.id === `portfolio-${initialWork}` || item.id === initialWork) ?? null
  ));

  const visibleItems = useMemo(() => items
    .filter((item) => category === "all" || item.category === category)
    .filter((item) => {
      const query = normalize(initialQuery, locale);
      return !query || [item.title[locale], item.description[locale], item.category]
        .some((value) => normalize(value, locale).includes(query));
    })
    .sort((left, right) => (
      sortOrder === "featured"
        ? Number(right.featured) - Number(left.featured) || left.displayOrder - right.displayOrder
        : right.displayOrder - left.displayOrder
    )), [category, initialQuery, items, locale, sortOrder]);

  return (
    <>
      <div className={styles.controls}>
        <div aria-label={copy.categories} className={styles.categoryFilters}>
          <button aria-pressed={category === "all"} onClick={() => setCategory("all")} type="button">{copy.all}</button>
          {categories.map((value) => (
            <button aria-pressed={category === value} key={value} onClick={() => setCategory(value)} type="button">
              {categoryLabel(value, locale)}
            </button>
          ))}
        </div>
        <label className={styles.sortControl}>
          <span>{copy.sort}</span>
          <select aria-label={copy.sort} onChange={(event) => setSortOrder(event.target.value as SortOrder)} value={sortOrder}>
            <option value="newest">{copy.newest}</option>
            <option value="featured">{copy.featured}</option>
          </select>
        </label>
      </div>

      <div className={styles.gallery}>
        {visibleItems.map((item) => (
          <button
            aria-label={`${copy.view} ${item.title[locale]}`}
            className={`${styles.card} ${styles[item.crop.gridSpan]}`}
            key={item.id}
            onClick={() => setSelectedItem(item)}
            type="button"
          >
            <ResponsiveMedia
              className={styles.cardMedia}
              crop={item.crop}
              locale={locale}
              media={item.media}
              sizes="(max-width: 520px) 100vw, (max-width: 780px) 50vw, 33vw"
            />
            <span className={styles.cardOverlay}>
              <span>{categoryLabel(item.category, locale)}</span>
              <strong>{item.title[locale]}</strong>
            </span>
          </button>
        ))}
      </div>
      {!visibleItems.length ? <p className={styles.empty} role="status">{copy.empty}</p> : null}

      <ImageLightbox item={selectedItem} locale={locale} onClose={() => setSelectedItem(null)} />
    </>
  );
}

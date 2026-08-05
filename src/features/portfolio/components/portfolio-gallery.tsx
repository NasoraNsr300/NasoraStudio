"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import type { PortfolioItem } from "@/shared/types/public-content";

import { ImageLightbox } from "./image-lightbox";
import styles from "./portfolio.module.css";

export type PortfolioGalleryProps = {
  items: PortfolioItem[];
};

type SortOrder = "newest" | "featured";

export function PortfolioGallery({ items }: PortfolioGalleryProps) {
  const [category, setCategory] = useState("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category))).sort(),
    [items],
  );
  const visibleItems = useMemo(() => items
    .filter((item) => category === "all" || item.category === category)
    .sort((left, right) => (
      sortOrder === "featured"
        ? Number(right.featured) - Number(left.featured) || left.displayOrder - right.displayOrder
        : right.displayOrder - left.displayOrder
    )), [category, items, sortOrder]);

  return (
    <>
      <div className={styles.controls}>
        <div aria-label="Portfolio categories" className={styles.categoryFilters}>
          <button aria-pressed={category === "all"} onClick={() => setCategory("all")} type="button">All work</button>
          {categories.map((value) => (
            <button aria-pressed={category === value} key={value} onClick={() => setCategory(value)} type="button">
              {value.slice(0, 1).toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
        <label className={styles.sortControl}>
          <span>Sort artwork</span>
          <select aria-label="Sort artwork" onChange={(event) => setSortOrder(event.target.value as SortOrder)} value={sortOrder}>
            <option value="newest">Newest</option>
            <option value="featured">Featured</option>
          </select>
        </label>
      </div>

      <div className={styles.gallery}>
        {visibleItems.map((item) => (
          <button
            aria-label={`View ${item.title.en}`}
            className={`${styles.card} ${styles[item.crop.gridSpan]}`}
            key={item.id}
            onClick={() => setSelectedItem(item)}
            type="button"
          >
            <Image
              alt={item.media.alt.en}
              fill
              sizes="(max-width: 520px) 100vw, (max-width: 780px) 50vw, 33vw"
              src={item.media.cardSrc}
              style={{ objectPosition: item.crop.objectPosition }}
            />
            <span className={styles.cardOverlay}>
              <span>{item.category}</span>
              <strong>{item.title.en}</strong>
            </span>
          </button>
        ))}
      </div>

      <ImageLightbox item={selectedItem} onClose={() => setSelectedItem(null)} />
    </>
  );
}

"use client";

import { useMemo, useState } from "react";

import type { Locale } from "@/shared/i18n/locales";
import type { ServiceCategory, ServiceType } from "@/shared/types/public-content";

import { AlbumTile } from "./album-tile";
import { ServiceCategoryPage } from "./service-category-page";
import styles from "./commission.module.css";

export type CommissionAlbumsPageProps = {
  categories: ServiceCategory[];
  locale: Locale;
  services: ServiceType[];
};

const copy = {
  en: {
    description: "Choose an album to browse available commission types and their guidance.",
    eyebrow: "Commission catalog",
    title: "COMMISSION",
  },
  th: {
    description: "เลือกอัลบั้มเพื่อดูรูปแบบงานและรายละเอียด",
    eyebrow: "รายการคอมมิชชัน",
    title: "COMMISSION",
  },
} as const;

export function CommissionAlbumsPage({ categories, locale, services }: CommissionAlbumsPageProps) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const sortedCategories = [...categories].sort((left, right) => left.displayOrder - right.displayOrder);
  const selectedCategory = sortedCategories.find((category) => category.slug === selectedSlug);
  const selectedServices = useMemo(
    () => services
      .filter((service) => service.published && service.categorySlug === selectedSlug)
      .sort((left, right) => left.displayOrder - right.displayOrder),
    [selectedSlug, services],
  );
  const labels = copy[locale];

  if (selectedCategory) {
    return (
      <ServiceCategoryPage
        category={selectedCategory}
        locale={locale}
        onBack={() => setSelectedSlug(null)}
        services={selectedServices}
      />
    );
  }

  return (
    <main className={styles.commissionPage}>
      <header className={styles.heading}>
        <p>{labels.eyebrow}</p>
        <h1 className={styles.albumPageTitle}>{labels.title}</h1>
        <span>{labels.description}</span>
      </header>
      <section aria-label={labels.title} className={styles.albumGrid}>
        {sortedCategories.map((category, index) => (
          <AlbumTile
            category={category}
            eager={index === 0}
            key={category.slug}
            locale={locale}
            onSelect={() => setSelectedSlug(category.slug)}
          />
        ))}
      </section>
    </main>
  );
}

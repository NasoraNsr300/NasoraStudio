"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useCatalogSync } from "@/features/catalog/client/use-catalog-sync";
import type { Locale } from "@/shared/i18n/locales";
import type { ServiceCategory, ServiceType } from "@/shared/types/public-content";

import { CommissionAlbumsPage } from "./commission-albums-page";
import styles from "./commission.module.css";

type CommissionSearchProps = {
  categories: ServiceCategory[];
  locale: Locale;
  services: ServiceType[];
};

const copy = {
  en: { album: "album", empty: "No commission categories or work types match that search.", eyebrow: "Commission search", title: "Commission search results", type: "Work type" },
  th: { album: "อัลบั้ม", empty: "ไม่พบหมวดหมู่หรือรูปแบบงานที่ตรงกับคำค้น", eyebrow: "ค้นหาคอมมิชชัน", title: "ผลการค้นหาคอมมิชชัน", type: "รูปแบบงาน" },
} as const;

function normalized(value: string, locale: Locale) {
  return value.trim().toLocaleLowerCase(locale);
}

export function CommissionSearch({ categories, locale, services }: CommissionSearchProps) {
  useCatalogSync();
  const query = useSearchParams().get("q") ?? "";
  const term = normalized(query, locale);
  const publishedCategories = categories.filter((category) => category.published);
  const publishedServices = services.filter((service) => service.published);
  if (!term) return <CommissionAlbumsPage categories={publishedCategories} locale={locale} services={publishedServices} />;

  const matchingCategories = publishedCategories.filter((category) =>
    [category.name[locale], category.description[locale]].some((value) => normalized(value, locale).includes(term)),
  );
  const matchingServices = publishedServices.filter((service) =>
    [service.name[locale], service.description[locale]].some((value) => normalized(value, locale).includes(term)),
  );
  const labels = copy[locale];

  return (
    <main className={styles.commissionPage}>
      <header className={styles.heading}>
        <p>{labels.eyebrow}</p>
        <h1>{labels.title}</h1>
        <span>“{query}”</span>
      </header>
      {matchingCategories.length || matchingServices.length ? (
        <div className={styles.searchResults}>
          {matchingCategories.map((category) => (
            <Link href={`/${locale}/commission/${category.slug}`} key={`category-${category.slug}`}>
              <span>{labels.album}</span><strong>{category.name[locale]} {labels.album}</strong><small>{category.description[locale]}</small>
            </Link>
          ))}
          {matchingServices.map((service) => (
            <Link href={`/${locale}/commission/${service.categorySlug}#${service.slug}`} key={`service-${service.categorySlug}-${service.slug}`}>
              <span>{labels.type}</span><strong>{service.name[locale]}</strong><small>{service.description[locale]}</small>
            </Link>
          ))}
        </div>
      ) : <p className={styles.empty} role="status">{labels.empty}</p>}
    </main>
  );
}

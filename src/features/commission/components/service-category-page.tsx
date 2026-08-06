"use client";

import { useMemo, useState } from "react";

import type { Locale } from "@/shared/i18n/locales";
import { getDictionary } from "@/shared/i18n/dictionaries";
import type { ServiceCategory, ServiceType } from "@/shared/types/public-content";

import { ServiceCard } from "./service-card";
import { ServiceDetailDialog } from "./service-detail-dialog";
import { EstimateRequestDialog } from "./estimate-request-dialog";
import styles from "./commission.module.css";

export type ServiceCategoryPageProps = {
  category: ServiceCategory;
  locale: Locale;
  onBack?(): void;
  services: ServiceType[];
};

const copy = {
  en: { album: "Album", all: "All types", filters: "Service type filters", suffix: "services" },
  th: { album: "อัลบั้ม", all: "ทุกรูปแบบ", filters: "ตัวกรองประเภทงาน", suffix: "รูปแบบงาน" },
} as const;

export function ServiceCategoryPage({ category, locale, onBack, services }: ServiceCategoryPageProps) {
  const [filter, setFilter] = useState("all");
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [previewService, setPreviewService] = useState<ServiceType | null>(null);
  const visibleServices = useMemo(() => services.filter((service) => filter === "all" || service.slug === filter), [filter, services]);
  const labels = copy[locale];
  const messages = getDictionary(locale).commission;

  return (
    <main className={`${styles.commissionPage} ${styles.serviceCategoryPage}`}>
      <header className={styles.heading}>
        <p>
          {onBack ? <button aria-label={messages.backToAlbums} className={styles.albumBreadcrumb} onClick={onBack} type="button">{labels.album}</button> : labels.album}
          {"　/　"}{category.name[locale]}
        </p>
        <div className={styles.categoryTitleRow}>
          <h1>{category.name[locale]}</h1>
          <span className={`${styles.categoryAvailability} ${styles[category.availability]}`}>● {category.availability.toUpperCase()}</span>
        </div>
        <span>{category.description[locale]}</span>
      </header>
      <div aria-label={labels.filters} className={styles.subtypeFilters}>
        <button aria-pressed={filter === "all"} onClick={() => setFilter("all")} type="button">{labels.all}</button>
        {services.map((service) => <button aria-pressed={filter === service.slug} key={service.slug} onClick={() => setFilter(service.slug)} type="button">{service.name[locale]}</button>)}
      </div>
      <section aria-label={`${category.name[locale]} ${labels.suffix}`} className={styles.serviceGrid}>
        {visibleServices.map((service, index) => <ServiceCard eager={index === 0} key={service.slug} locale={locale} onRequest={setPreviewService} onViewDetails={setSelectedService} service={service} />)}
      </section>
      {selectedService ? <ServiceDetailDialog locale={locale} onClose={() => setSelectedService(null)} open service={selectedService} /> : null}
      {previewService ? <EstimateRequestDialog locale={locale} onClose={() => setPreviewService(null)} service={previewService} /> : null}
    </main>
  );
}

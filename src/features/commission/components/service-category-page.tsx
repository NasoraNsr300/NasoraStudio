"use client";

import { useMemo, useState } from "react";

import type { Locale } from "@/shared/i18n/locales";
import type { ServiceCategory, ServiceType } from "@/shared/types/public-content";

import { ServiceCard } from "./service-card";
import { ServiceDetailDialog } from "./service-detail-dialog";
import styles from "./commission.module.css";

export type ServiceCategoryPageProps = {
  category: ServiceCategory;
  locale: Locale;
  services: ServiceType[];
};

const copy = {
  en: { all: "All types", eyebrow: "Commission album", filters: "Service type filters", suffix: "services" },
  th: { all: "ทุกรูปแบบ", eyebrow: "อัลบั้มคอมมิชชัน", filters: "ตัวกรองประเภทงาน", suffix: "รูปแบบงาน" },
} as const;

export function ServiceCategoryPage({ category, locale, services }: ServiceCategoryPageProps) {
  const [filter, setFilter] = useState("all");
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [previewService, setPreviewService] = useState<ServiceType | null>(null);
  const visibleServices = useMemo(() => services.filter((service) => filter === "all" || service.slug === filter), [filter, services]);
  const labels = copy[locale];

  return (
    <main className={styles.commissionPage}>
      <header className={styles.heading}>
        <p>{labels.eyebrow}</p>
        <h1>{category.name[locale]}</h1>
        <span>{category.description[locale]}</span>
      </header>
      <div aria-label={labels.filters} className={styles.subtypeFilters}>
        <button aria-pressed={filter === "all"} onClick={() => setFilter("all")} type="button">{labels.all}</button>
        {services.map((service) => <button aria-pressed={filter === service.slug} key={service.slug} onClick={() => setFilter(service.slug)} type="button">{service.name[locale]}</button>)}
      </div>
      <section aria-label={`${category.name[locale]} ${labels.suffix}`} className={styles.serviceGrid}>
        {visibleServices.map((service, index) => <ServiceCard eager={index === 0} key={service.slug} locale={locale} onRequest={setPreviewService} onViewDetails={setSelectedService} service={service} />)}
      </section>
      <ServiceDetailDialog initialPreview={Boolean(previewService)} key={`${(selectedService ?? previewService)?.slug ?? "none"}-${Boolean(previewService)}`} locale={locale} onClose={() => { setSelectedService(null); setPreviewService(null); }} open={Boolean(selectedService ?? previewService)} service={selectedService ?? previewService ?? services[0]} />
    </main>
  );
}

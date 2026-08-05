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

export function ServiceCategoryPage({ category, locale, services }: ServiceCategoryPageProps) {
  const [filter, setFilter] = useState("all");
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [previewService, setPreviewService] = useState<ServiceType | null>(null);
  const visibleServices = useMemo(() => services.filter((service) => filter === "all" || service.slug === filter), [filter, services]);

  return (
    <main className={styles.commissionPage}>
      <header className={styles.heading}>
        <p>{locale === "en" ? "Commission album" : "à¸­à¸±à¸¥à¸šà¸±à¹‰à¸¡à¸„à¸­à¸¡à¸¡à¸´à¸Šà¸Šà¸±à¸™"}</p>
        <h1>{category.name[locale]}</h1>
        <span>{category.description[locale]}</span>
      </header>
      <div aria-label={locale === "en" ? "Service type filters" : "à¸•à¸±à¸§à¸à¸£à¸­à¸‡à¸›à¸£à¸°à¹€à¸ à¸—à¸‡à¸²à¸™"} className={styles.subtypeFilters}>
        <button aria-pressed={filter === "all"} onClick={() => setFilter("all")} type="button">{locale === "en" ? "All types" : "à¸—à¸¸à¸à¸£à¸¹à¸›à¹à¸šà¸š"}</button>
        {services.map((service) => <button aria-pressed={filter === service.slug} key={service.slug} onClick={() => setFilter(service.slug)} type="button">{service.name[locale]}</button>)}
      </div>
      <section aria-label={locale === "en" ? `${category.name.en} services` : `${category.name.th} à¸£à¸¹à¸›à¹à¸šà¸šà¸‡à¸²à¸™`} className={styles.serviceGrid}>
        {visibleServices.map((service, index) => <ServiceCard eager={index === 0} key={service.slug} locale={locale} onRequest={setPreviewService} onViewDetails={setSelectedService} service={service} />)}
      </section>
      <ServiceDetailDialog initialPreview={Boolean(previewService)} key={`${(selectedService ?? previewService)?.slug ?? "none"}-${Boolean(previewService)}`} locale={locale} onClose={() => { setSelectedService(null); setPreviewService(null); }} open={Boolean(selectedService ?? previewService)} service={selectedService ?? previewService ?? services[0]} />
    </main>
  );
}

"use client";

import { FileText, LayoutGrid, List, ListOrdered, Image as ImageIcon } from "lucide-react";
import { useMemo, useState } from "react";

import type { Locale } from "@/shared/i18n/locales";
import { getDictionary } from "@/shared/i18n/dictionaries";
import type { ServiceCategory, ServiceType } from "@/shared/types/public-content";
import { ResponsiveMedia } from "@/shared/components/media/responsive-media";
import { useCatalogSync } from "@/features/catalog/client/use-catalog-sync";

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
  useCatalogSync();
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "gallery">("grid");
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

      <div className={styles.categoryControlsBar}>
        <div aria-label={labels.filters} className={styles.subtypeFilters}>
          <button aria-pressed={filter === "all"} onClick={() => setFilter("all")} type="button">{labels.all}</button>
          {services.map((service) => <button aria-pressed={filter === service.slug} key={service.slug} onClick={() => setFilter(service.slug)} type="button">{service.name[locale]}</button>)}
        </div>
        <div aria-label={locale === "th" ? "เลือกรูปแบบการแสดงผล" : "Select view mode"} className={styles.viewModePill}>
          <button aria-label={locale === "th" ? "มุมมองตาราง" : "Grid view"} aria-pressed={viewMode === "grid"} className={styles.viewModeButton} onClick={() => setViewMode("grid")} type="button">
            <LayoutGrid size={17} />
          </button>
          <button aria-label={locale === "th" ? "มุมมองรายการ" : "List view"} aria-pressed={viewMode === "list"} className={styles.viewModeButton} onClick={() => setViewMode("list")} type="button">
            <List size={17} />
          </button>
          <button aria-label={locale === "th" ? "มุมมองแกลเลอรี" : "Gallery view"} aria-pressed={viewMode === "gallery"} className={styles.viewModeButton} onClick={() => setViewMode("gallery")} type="button">
            <ImageIcon size={17} />
          </button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <section aria-label={`${category.name[locale]} ${labels.suffix}`} className={styles.serviceGrid}>
          {visibleServices.map((service, index) => <ServiceCard eager={index === 0} key={service.slug} locale={locale} onRequest={setPreviewService} onViewDetails={setSelectedService} service={service} />)}
        </section>
      ) : null}

      {viewMode === "list" ? (
        <section aria-label={`${category.name[locale]} ${labels.suffix}`} className={styles.serviceList}>
          {visibleServices.map((service, index) => {
            const example = service.examples[0];
            const isClosed = service.availability === "closed";
            return (
              <article className={styles.serviceListItem} key={service.slug}>
                <div className={styles.listMedia}>
                  {example ? <ResponsiveMedia className={styles.listImage} crop={example.crop} locale={locale} media={example.media} priority={index === 0} sizes="(max-width: 768px) 100vw, 360px" /> : null}
                </div>
                <div className={styles.listContent}>
                  <span className={styles.serviceSubtitle}>COMMISSION</span>
                  <div className={styles.listTitleRow}>
                    <h2>≡ {service.name[locale]}</h2>
                    <span className={styles.subtypeBadge}>{category.name[locale]}</span>
                  </div>
                  <p className={styles.listDescription}>{service.description[locale]}</p>
                  <div className={styles.listActionsGroup}>
                    <button className={styles.estimatePrimaryButton} disabled={isClosed} onClick={() => setPreviewService(service)} type="button">
                      <FileText size={16} /> {messages.estimate}
                    </button>
                    <button className={styles.detailsSecondaryButton} onClick={() => setSelectedService(service)} type="button">
                      <ListOrdered size={16} /> {messages.detailsAndRates}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}

      {viewMode === "gallery" ? (
        <section aria-label={`${category.name[locale]} ${labels.suffix}`} className={styles.serviceGallery}>
          {visibleServices.map((service, index) => {
            const example = service.examples[0];
            const isClosed = service.availability === "closed";
            return (
              <article className={styles.serviceGalleryItem} key={service.slug}>
                <div className={styles.galleryMedia}>
                  {example ? <ResponsiveMedia className={styles.galleryImage} crop={example.crop} locale={locale} media={example.media} priority={index === 0} sizes="(max-width: 1200px) 100vw, 1100px" /> : null}
                </div>
                <div className={styles.galleryBar}>
                  <div className={styles.galleryInfo}>
                    <span className={styles.serviceSubtitle}>COMMISSION</span>
                    <div className={styles.galleryTitleRow}>
                      <h2>≡ {service.name[locale]}</h2>
                      <span className={styles.subtypeBadge}>{category.name[locale]}</span>
                    </div>
                  </div>
                  <div className={styles.galleryActionsGroup}>
                    <button className={styles.estimatePrimaryButton} disabled={isClosed} onClick={() => setPreviewService(service)} type="button">
                      <FileText size={16} /> {messages.estimate}
                    </button>
                    <button className={styles.detailsSecondaryButton} onClick={() => setSelectedService(service)} type="button">
                      <ListOrdered size={16} /> {messages.detailsAndRates}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}

      {selectedService ? <ServiceDetailDialog locale={locale} onClose={() => setSelectedService(null)} open service={selectedService} /> : null}
      {previewService ? <EstimateRequestDialog locale={locale} onClose={() => setPreviewService(null)} service={previewService} /> : null}
    </main>
  );
}

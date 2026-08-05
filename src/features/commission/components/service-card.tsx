import Image from "next/image";

import { serviceReferenceUsd } from "@/data/fixtures/public-content";
import type { Locale } from "@/shared/i18n/locales";
import type { ServiceType } from "@/shared/types/public-content";

import styles from "./commission.module.css";

export type ServiceCardProps = {
  locale: Locale;
  onRequest(service: ServiceType): void;
  onViewDetails(service: ServiceType): void;
  service: ServiceType;
};

function formatThb(amount: number) {
  return `THB ${new Intl.NumberFormat("en-US").format(amount)}`;
}

const serviceCopy: Record<Locale, {
  availability: Record<ServiceType["availability"], string>;
  details: (name: string) => string;
  priceGuidance: string;
  request: (name: string) => string;
  usdGuidance: string;
}> = {
  en: {
    availability: { open: "Open", limited: "Limited availability", closed: "Closed" },
    details: (name) => `View details for ${name}`,
    priceGuidance: "Starting reference price",
    request: (name) => `Request estimate for ${name}`,
    usdGuidance: "USD guidance",
  },
  th: {
    availability: { open: "เปิดรับ", limited: "รับจำนวนจำกัด", closed: "ปิดรับ" },
    details: (name) => `ดูรายละเอียด ${name}`,
    priceGuidance: "ราคาอ้างอิงเริ่มต้น",
    request: (name) => `ขอประเมินราคา ${name}`,
    usdGuidance: "แนวทางราคา USD",
  },
};

function displayUsd(amount: number, locale: Locale) {
  return serviceReferenceUsd[amount] ?? serviceCopy[locale].usdGuidance;
}

export function ServiceCard({ locale, onRequest, onViewDetails, service }: ServiceCardProps) {
  const fromPrice = service.referencePrices[0];
  const isClosed = service.availability === "closed";
  const copy = serviceCopy[locale];
  const requestLabel = copy.request(service.name[locale]);
  const detailsLabel = copy.details(service.name[locale]);

  return (
    <article className={styles.serviceCard}>
      <div className={styles.serviceImage}>
        <Image alt={service.examples[0]?.media.alt[locale] ?? service.name[locale]} fill sizes="(max-width: 720px) 100vw, 33vw" src={service.examples[0]?.media.cardSrc ?? "/fixtures/moonlit.svg"} style={{ objectPosition: service.examples[0]?.crop.objectPosition }} />
      </div>
      <div className={styles.serviceContent}>
        <span className={`${styles.status} ${styles[service.availability]}`}>{copy.availability[service.availability]}</span>
        <h2>{service.name[locale]}</h2>
        <p>{service.description[locale]}</p>
        <p className={styles.price}><span>{copy.priceGuidance}</span><strong>{formatThb(fromPrice.amountThb)}</strong><span>{displayUsd(fromPrice.amountThb, locale)}</span></p>
        <p className={styles.timing}>{service.timingGuidance[locale]}</p>
        <div className={styles.serviceActions}>
          <button disabled={isClosed} onClick={() => onRequest(service)} type="button">{requestLabel}</button>
          <button className={styles.secondaryButton} onClick={() => onViewDetails(service)} type="button">{detailsLabel}</button>
        </div>
      </div>
    </article>
  );
}

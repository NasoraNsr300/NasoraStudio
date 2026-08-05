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

function displayUsd(amount: number) {
  return serviceReferenceUsd[amount] ?? "USD guidance";
}

export function ServiceCard({ locale, onRequest, onViewDetails, service }: ServiceCardProps) {
  const fromPrice = service.referencePrices[0];
  const isClosed = service.availability === "closed";
  const requestLabel = locale === "en" ? `Request estimate for ${service.name.en}` : `à¸‚à¸­à¸›à¸£à¸°à¹€à¸¡à¸´à¸™à¸£à¸²à¸„à¸² ${service.name.th}`;
  const detailsLabel = locale === "en" ? `View details for ${service.name.en}` : `à¸”à¸¹à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸” ${service.name.th}`;

  return (
    <article className={styles.serviceCard}>
      <div className={styles.serviceImage}>
        <Image alt={service.examples[0]?.media.alt[locale] ?? service.name[locale]} fill sizes="(max-width: 720px) 100vw, 33vw" src={service.examples[0]?.media.cardSrc ?? "/fixtures/moonlit.svg"} style={{ objectPosition: service.examples[0]?.crop.objectPosition }} />
      </div>
      <div className={styles.serviceContent}>
        <span className={`${styles.status} ${styles[service.availability]}`}>{service.availability}</span>
        <h2>{service.name[locale]}</h2>
        <p>{service.description[locale]}</p>
        <p className={styles.price}><strong>{formatThb(fromPrice.amountThb)}</strong><span>{displayUsd(fromPrice.amountThb)}</span></p>
        <p className={styles.timing}>{service.timingGuidance[locale]}</p>
        <div className={styles.serviceActions}>
          <button disabled={isClosed} onClick={() => onRequest(service)} type="button">{requestLabel}</button>
          <button className={styles.secondaryButton} onClick={() => onViewDetails(service)} type="button">{detailsLabel}</button>
        </div>
      </div>
    </article>
  );
}

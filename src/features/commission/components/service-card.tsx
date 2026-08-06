import { serviceReferenceUsd } from "@/features/commission/lib/pricing-guidance";
import type { Locale } from "@/shared/i18n/locales";
import type { ServiceType } from "@/shared/types/public-content";
import { ResponsiveMedia } from "@/shared/components/media/responsive-media";
import { getDictionary } from "@/shared/i18n/dictionaries";

import styles from "./commission.module.css";

export type ServiceCardProps = {
  eager?: boolean;
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
  priceGuidance: string;
  usdGuidance: string;
}> = {
  en: {
    availability: { open: "Open", limited: "Limited availability", closed: "Closed" },
    priceGuidance: "Starting reference price",
    usdGuidance: "USD guidance",
  },
  th: {
    availability: { open: "เปิดรับ", limited: "รับจำนวนจำกัด", closed: "ปิดรับ" },
    priceGuidance: "ราคาอ้างอิงเริ่มต้น",
    usdGuidance: "แนวทางราคา USD",
  },
};

function displayUsd(amount: number, locale: Locale) {
  return serviceReferenceUsd[amount] ?? serviceCopy[locale].usdGuidance;
}

export function ServiceCard({ eager = false, locale, onRequest, onViewDetails, service }: ServiceCardProps) {
  const fromPrice = service.referencePrices[0];
  const isClosed = service.availability === "closed";
  const copy = serviceCopy[locale];
  const messages = getDictionary(locale).commission;
  const example = service.examples[0];

  return (
    <article className={styles.serviceCard} id={service.slug}>
      <div className={styles.serviceImage}>
        {example ? <ResponsiveMedia className={styles.serviceMedia} crop={example.crop} locale={locale} media={example.media} priority={eager} sizes="(max-width: 720px) 100vw, 33vw" /> : null}
      </div>
      <div className={styles.serviceContent}>
        <span className={`${styles.status} ${styles[service.availability]}`}>{copy.availability[service.availability]}</span>
        <h2>{service.name[locale]}</h2>
        <p>{service.description[locale]}</p>
        <p className={styles.price}><span>{copy.priceGuidance}</span><strong>{formatThb(fromPrice.amountThb)}</strong><span>{displayUsd(fromPrice.amountThb, locale)}</span></p>
        <p className={styles.timing}>{service.timingGuidance[locale]}</p>
        <div className={styles.serviceActions}>
          <button disabled={isClosed} onClick={() => onRequest(service)} type="button">{messages.estimate}</button>
          <button className={styles.secondaryButton} onClick={() => onViewDetails(service)} type="button">{messages.detailsAndRates}</button>
        </div>
      </div>
    </article>
  );
}

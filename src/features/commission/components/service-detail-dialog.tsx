"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { serviceReferenceUsd } from "@/data/fixtures/public-content";
import type { Locale } from "@/shared/i18n/locales";
import type { ServiceType } from "@/shared/types/public-content";

import styles from "./commission.module.css";

export type ServiceDetailDialogProps = {
  initialPreview?: boolean;
  locale?: Locale;
  onClose(): void;
  open: boolean;
  service: ServiceType;
};

const documentNames: Record<string, Record<Locale, string>> = {
  "commission-terms": { en: "Commission Terms", th: "à¹€à¸‡à¸·à¹ˆà¸­à¸™à¹„à¸‚à¸à¸²à¸£à¸„à¸­à¸¡à¸¡à¸´à¸Šà¸Šà¸±à¸™" },
  "revision-guide": { en: "Revision Guide", th: "à¸„à¸¹à¹ˆà¸¡à¸·à¸­à¸à¸²à¸£à¹à¸à¹‰à¸‡à¸²à¸™" },
};

function formatThb(amount: number) {
  return `THB ${new Intl.NumberFormat("en-US").format(amount)}`;
}

function formatModifier(kind: "fixed" | "percentage", value: number) {
  return kind === "fixed" ? `+${formatThb(value)}` : `+${value}%`;
}

export function ServiceDetailDialog({ initialPreview = false, locale = "en", onClose, open, service }: ServiceDetailDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [previewOpen, setPreviewOpen] = useState(initialPreview);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div aria-label={service.name[locale]} aria-modal="true" className={styles.dialogBackdrop} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} role="dialog">
      <section className={styles.detailDialog}>
        <header className={styles.dialogHeader}>
          <div>
            <p>{service.availability === "closed" ? "Closed" : service.availability === "limited" ? "Limited availability" : "Open"}</p>
            <h2>{service.name[locale]}</h2>
            <span>{service.description[locale]}</span>
          </div>
          <button aria-label="Close service details" className={styles.dialogClose} onClick={onClose} ref={closeRef} type="button">×</button>
        </header>
        <div className={styles.dialogBody}>
          <div className={styles.samples}>
            {service.examples.map((example) => <figure key={example.id}><Image alt={example.media.alt[locale]} height={example.media.height} src={example.media.detailSrc} width={example.media.width} /><figcaption>{example.title[locale]}</figcaption></figure>)}
          </div>
          <div className={styles.guidance}>
            <section>
              <h3>Reference pricing</h3>
              <dl className={styles.priceTable}>
                {service.referencePrices.map((price) => <div key={price.usage}><dt>{price.label[locale]}</dt><dd><strong>{formatThb(price.amountThb)}</strong><span>{serviceReferenceUsd[price.amountThb] ?? "USD guidance"}</span></dd></div>)}
              </dl>
              <p>Rush — availability and timing are confirmed case by case.</p>
            </section>
            <section>
              <h3>Additions</h3>
              {service.modifiers.length ? <ul>{service.modifiers.map((modifier) => <li key={modifier.label.en}><span>{modifier.label[locale]}</span><strong>{formatModifier(modifier.kind, modifier.value)}</strong></li>)}</ul> : <p>No standard additions listed.</p>}
            </section>
            <section className={styles.timingRevisions}>
              <div><h3>Timing</h3><p>{service.timingGuidance[locale]}</p></div>
              <div><h3>Revisions</h3><p>4 standard revisions</p></div>
            </section>
            <section className={styles.documentLinks}>
              <h3>Helpful documents</h3>
              {service.documentSlugs.map((slug) => <Link href={`/${locale}/documents/${slug}`} key={slug}>{documentNames[slug]?.[locale] ?? slug}</Link>)}
            </section>
          </div>
        </div>
        <footer className={styles.dialogActions}>
          <p>Final pricing is confirmed after reviewing your brief.</p>
          {previewOpen ? <p className={styles.previewNotice} role="status">The interactive estimate form arrives in Stage 2. This preview does not submit or collect any information.</p> : null}
          <div>
            <button disabled={service.availability === "closed"} onClick={() => setPreviewOpen(true)} type="button">Request estimate</button>
            <button className={styles.secondaryButton} onClick={onClose} type="button">Close</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

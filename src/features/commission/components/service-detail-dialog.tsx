"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { serviceReferenceUsd } from "@/data/fixtures/public-content";
import type { Locale } from "@/shared/i18n/locales";
import type { ServiceAvailability, ServiceType } from "@/shared/types/public-content";

import styles from "./commission.module.css";

export type ServiceDetailDialogProps = {
  initialPreview?: boolean;
  locale?: Locale;
  onClose(): void;
  open: boolean;
  service: ServiceType;
};

const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const dialogCopy: Record<Locale, {
  additions: string;
  availability: Record<ServiceAvailability, string>;
  close: string;
  closeDetails: string;
  closePreview: string;
  documents: string;
  finalPrice: string;
  noAdditions: string;
  preview: string;
  previewLabel: string;
  referencePricing: string;
  request: string;
  revisions: string;
  revisionsValue: string;
  rush: string;
  timing: string;
  usdGuidance: string;
}> = {
  en: {
    additions: "Additions",
    availability: { open: "Open", limited: "Limited availability", closed: "Closed" },
    close: "Close",
    closeDetails: "Close service details",
    closePreview: "Close request preview",
    documents: "Helpful documents",
    finalPrice: "Final pricing is confirmed after reviewing your brief.",
    noAdditions: "No standard additions listed.",
    preview: "The interactive estimate form arrives in Stage 2. This preview does not submit or collect any information.",
    previewLabel: "Request preview",
    referencePricing: "Reference pricing",
    request: "Request estimate",
    revisions: "Revisions",
    revisionsValue: "4 standard revisions",
    rush: "Rush — availability and timing are confirmed case by case.",
    timing: "Timing",
    usdGuidance: "USD guidance",
  },
  th: {
    additions: "รายการเพิ่มเติม",
    availability: { open: "เปิดรับ", limited: "รับจำนวนจำกัด", closed: "ปิดรับ" },
    close: "ปิด",
    closeDetails: "ปิดรายละเอียดบริการ",
    closePreview: "ปิดตัวอย่างการขอประเมินราคา",
    documents: "เอกสารที่เกี่ยวข้อง",
    finalPrice: "ราคาสุดท้ายจะยืนยันหลังตรวจสอบรายละเอียดบรีฟของคุณ",
    noAdditions: "ไม่มีรายการเพิ่มเติมมาตรฐาน",
    preview: "แบบฟอร์มประเมินราคาแบบโต้ตอบจะพร้อมใน Stage 2 ตัวอย่างนี้จะไม่ส่งหรือเก็บข้อมูลใด ๆ",
    previewLabel: "ตัวอย่างการขอประเมินราคา",
    referencePricing: "ราคาอ้างอิง",
    request: "ขอประเมินราคา",
    revisions: "การแก้ไข",
    revisionsValue: "แก้ไขมาตรฐาน 4 ครั้ง",
    rush: "เร่งด่วน — ยืนยันคิวและระยะเวลาเป็นรายกรณี",
    timing: "ระยะเวลาทำงาน",
    usdGuidance: "แนวทางราคา USD",
  },
};

const documentNames: Record<string, Record<Locale, string>> = {
  "commission-terms": { en: "Commission Terms", th: "เงื่อนไขการคอมมิชชัน" },
  "revision-guide": { en: "Revision Guide", th: "คู่มือการแก้ไขงาน" },
};

function formatThb(amount: number) {
  return `THB ${new Intl.NumberFormat("en-US").format(amount)}`;
}

function formatModifier(kind: "fixed" | "percentage", value: number) {
  return kind === "fixed" ? `+${formatThb(value)}` : `+${value}%`;
}

function useDialogFocus(
  open: boolean,
  onClose: () => void,
  dialogRef: React.RefObject<HTMLElement | null>,
  initialFocusRef: React.RefObject<HTMLElement | null>,
  interactive = true,
) {
  const openerRef = useRef<HTMLElement | null>(null);
  const activeRef = useRef(open && interactive);
  useLayoutEffect(() => {
    activeRef.current = open && interactive;
  }, [interactive, open]);

  const close = useCallback(() => {
    onClose();
    openerRef.current?.focus();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    initialFocusRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (!activeRef.current) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && (current === first || !dialogRef.current?.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !dialogRef.current?.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      openerRef.current?.focus();
    };
  }, [open, close, dialogRef, initialFocusRef]);

  return close;
}

function RequestPreviewDialog({ locale, onClose }: { locale: Locale; onClose: () => void }) {
  const copy = dialogCopy[locale];
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = useDialogFocus(true, onClose, dialogRef, closeRef);

  return (
    <div aria-label={copy.previewLabel} aria-modal="true" className={styles.previewBackdrop} onClick={(event) => { if (event.target === event.currentTarget) close(); }} ref={dialogRef} role="dialog">
      <section className={styles.previewDialog}>
        <p role="status">{copy.preview}</p>
        <button aria-label={copy.closePreview} className={styles.secondaryButton} onClick={close} ref={closeRef} type="button">{copy.close}</button>
      </section>
    </div>
  );
}

export function ServiceDetailDialog({ initialPreview = false, locale = "en", onClose, open, service }: ServiceDetailDialogProps) {
  const copy = dialogCopy[locale];
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [previewOpen, setPreviewOpen] = useState(initialPreview);
  const close = useDialogFocus(open, onClose, dialogRef, closeRef, !previewOpen);

  if (!open) return null;

  return (
    <>
    <div aria-hidden={previewOpen || undefined} aria-label={service.name[locale]} aria-modal="true" className={styles.dialogBackdrop} inert={previewOpen || undefined} onClick={(event) => { if (event.target === event.currentTarget) close(); }} ref={dialogRef} role="dialog">
      <section className={styles.detailDialog}>
        <header className={styles.dialogHeader}>
          <div>
            <p>{copy.availability[service.availability]}</p>
            <h2>{service.name[locale]}</h2>
            <span>{service.description[locale]}</span>
          </div>
          <button aria-label={copy.closeDetails} className={styles.dialogClose} onClick={close} ref={closeRef} type="button">×</button>
        </header>
        <div className={styles.dialogBody}>
          <div className={styles.samples}>
            {service.examples.map((example) => <figure key={example.id}><Image alt={example.media.alt[locale]} height={example.media.height} src={example.media.detailSrc} width={example.media.width} /><figcaption>{example.title[locale]}</figcaption></figure>)}
          </div>
          <div className={styles.guidance}>
            <section>
              <h3>{copy.referencePricing}</h3>
              <dl className={styles.priceTable}>
                {service.referencePrices.map((price) => <div key={price.usage}><dt>{price.label[locale]}</dt><dd><strong>{formatThb(price.amountThb)}</strong><span>{serviceReferenceUsd[price.amountThb] ?? copy.usdGuidance}</span></dd></div>)}
              </dl>
              <p>{copy.rush}</p>
            </section>
            <section>
              <h3>{copy.additions}</h3>
              {service.modifiers.length ? <ul>{service.modifiers.map((modifier) => <li key={modifier.label.en}><span>{modifier.label[locale]}</span><strong>{formatModifier(modifier.kind, modifier.value)}</strong></li>)}</ul> : <p>{copy.noAdditions}</p>}
            </section>
            <section className={styles.timingRevisions}>
              <div><h3>{copy.timing}</h3><p>{service.timingGuidance[locale]}</p></div>
              <div><h3>{copy.revisions}</h3><p>{copy.revisionsValue}</p></div>
            </section>
            <section className={styles.documentLinks}>
              <h3>{copy.documents}</h3>
              {service.documentSlugs.map((slug) => <Link href={`/${locale}/documents/${slug}`} key={slug}>{documentNames[slug]?.[locale] ?? slug}</Link>)}
            </section>
          </div>
        </div>
        <footer className={styles.dialogActions}>
          <p>{copy.finalPrice}</p>
          <div>
            <button disabled={service.availability === "closed"} onClick={() => setPreviewOpen(true)} type="button">{copy.request}</button>
            <button className={styles.secondaryButton} onClick={close} type="button">{copy.close}</button>
          </div>
        </footer>
      </section>
    </div>
    {previewOpen ? <RequestPreviewDialog locale={locale} onClose={() => setPreviewOpen(false)} /> : null}
    </>
  );
}

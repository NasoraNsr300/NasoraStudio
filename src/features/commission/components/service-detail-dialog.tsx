"use client";

import { ChevronRight, Clock3, FileText, Info, RotateCcw, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { serviceReferenceUsd } from "@/features/commission/lib/pricing-guidance";
import { getDictionary } from "@/shared/i18n/dictionaries";
import type { Locale } from "@/shared/i18n/locales";
import type { ServiceAvailability, ServiceType } from "@/shared/types/public-content";

import styles from "./commission.module.css";
import { EstimateRequestDialog } from "./estimate-request-dialog";

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
  commercial: string;
  documents: string;
  finalPrice: string;
  imageHint: string;
  noAdditions: string;
  normal: string;
  normalHint: string;
  personal: string;
  referenceNote: string;
  referencePricing: string;
  revisions: string;
  revisionsHint: string;
  revisionsValue: string;
  rush: string;
  rushHint: string;
  timing: string;
}> = {
  en: {
    additions: "Additional pricing",
    availability: { open: "Open", limited: "Limited", closed: "Closed" },
    commercial: "Commercial",
    documents: "Read service terms",
    finalPrice: "The final price is assessed once the project details have been reviewed.",
    imageHint: "Click an image to view it full size",
    noAdditions: "No standard additions listed",
    normal: "Normal",
    normalHint: "Standard turnaround",
    personal: "Personal",
    referenceNote: "Reference pricing may change based on the project details.",
    referencePricing: "Reference pricing",
    revisions: "Standard revisions",
    revisionsHint: "Additional changes are assessed separately",
    revisionsValue: "4 rounds",
    rush: "Rush",
    rushHint: "Priority queue",
    timing: "Turnaround",
  },
  th: {
    additions: "ราคาเพิ่มเติม",
    availability: { open: "เปิดรับ", limited: "รับจำนวนจำกัด", closed: "ปิดรับ" },
    commercial: "เชิงพาณิชย์",
    documents: "อ่านข้อตกลงการใช้งาน",
    finalPrice: "ราคาสุดท้ายจะประเมินอีกครั้งหลังจากได้รับรายละเอียดของงาน",
    imageHint: "คลิกที่ภาพเพื่อดูขนาดเต็ม",
    noAdditions: "ยังไม่มีราคาเพิ่มเติมมาตรฐาน",
    normal: "NORMAL",
    normalHint: "ระยะเวลามาตรฐาน",
    personal: "PERSONAL",
    referenceNote: "ราคาเป็นราคาอ้างอิง อาจเปลี่ยนแปลงตามรายละเอียดของงาน",
    referencePricing: "ราคาอ้างอิง",
    revisions: "แก้ฟรีมาตรฐาน",
    revisionsHint: "เกินกว่านี้คิดเพิ่มตามรายละเอียด",
    revisionsValue: "4 ครั้ง",
    rush: "RUSH",
    rushHint: "เร่งด่วน",
    timing: "ระยะเวลาทำงาน",
  },
};

const documentNames: Record<string, Record<Locale, string>> = {
  "commission-terms": { en: "Commission Terms", th: "ข้อตกลงการคอมมิชชัน" },
  "revision-guide": { en: "Revision Guide", th: "คู่มือการแก้งาน" },
};

function formatThb(amount: number) {
  return new Intl.NumberFormat("en-US").format(amount);
}

function formatUsd(amount: number) {
  const guidance = serviceReferenceUsd[amount];
  if (guidance?.startsWith("≈")) return guidance;
  return `≈ ${Math.round(amount / 33)} USD`;
}

function formatModifier(kind: "fixed" | "percentage", value: number) {
  return kind === "fixed" ? `+${formatThb(value)} THB` : `+${value}%`;
}

function titleCaseSlug(slug: string) {
  return slug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
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

export function ServiceDetailDialog({ initialPreview = false, locale = "en", onClose, open, service }: ServiceDetailDialogProps) {
  const copy = dialogCopy[locale];
  const messages = getDictionary(locale).commission;
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const requestRef = useRef<HTMLButtonElement>(null);
  const previousPreviewOpen = useRef(initialPreview);
  const [previewOpen, setPreviewOpen] = useState(initialPreview);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [activeExample, setActiveExample] = useState(0);
  const close = useDialogFocus(open, onClose, dialogRef, closeRef, !previewOpen && !imagePreviewOpen);
  const categoryName = titleCaseSlug(service.categorySlug);
  const serviceName = service.name[locale].replace(new RegExp(`^${categoryName}\\s+`, "i"), "");
  const example = service.examples[activeExample] ?? service.examples[0];

  useEffect(() => {
    if (previousPreviewOpen.current && !previewOpen) requestRef.current?.focus();
    previousPreviewOpen.current = previewOpen;
  }, [previewOpen]);

  if (!open) return null;

  return <>
    <div aria-hidden={previewOpen || imagePreviewOpen || undefined} aria-labelledby={`service-${service.slug}`} aria-modal="true" className={styles.dialogBackdrop} inert={previewOpen || imagePreviewOpen || undefined} onClick={(event) => { if (event.target === event.currentTarget) close(); }} ref={dialogRef} role="dialog">
      <section className={styles.detailDialog}>
        <header className={styles.detailHeroHeader}>
          <div className={styles.detailTitleLine}><Sparkles aria-hidden="true" /><h2 aria-label={service.name[locale]} id={`service-${service.slug}`}>{serviceName}</h2><span>—</span><strong>{categoryName}</strong></div>
          <div className={styles.detailIntro}>
            <span className={`${styles.detailAvailability} ${styles[service.availability]}`}>● {copy.availability[service.availability]}</span>
            <p>{service.description[locale]}</p>
          </div>
          <button aria-label={messages.closeDetails} className={styles.detailClose} onClick={close} ref={closeRef} type="button"><X /></button>
        </header>

        <div className={styles.detailBody}>
          <div className={styles.detailGallery}>
            {example ? <button aria-label={locale === "th" ? "ดูภาพตัวอย่างขนาดเต็ม" : "View sample image full size"} className={styles.detailMainImage} onClick={() => setImagePreviewOpen(true)} type="button">
              {/* eslint-disable-next-line @next/next/no-img-element -- stored full detail derivative */}
              <img alt={example.media.alt[locale]} height={example.media.height} src={example.media.detailSrc} width={example.media.width} />
            </button> : <div className={styles.detailMainImage} />}
            <div className={styles.detailThumbnails}>
              {service.examples.map((item, index) => <button aria-pressed={activeExample === index} key={item.id} onClick={() => setActiveExample(index)} type="button">
                {/* eslint-disable-next-line @next/next/no-img-element -- stored thumbnail derivative */}
                <img alt={item.media.alt[locale]} height={item.media.height} src={item.media.thumbnailSrc} width={item.media.width} />
              </button>)}
            </div>
            <p className={styles.detailImageHint}><Sparkles size={14} />{copy.imageHint}</p>
          </div>

          <aside className={styles.detailSidebar}>
            <section className={styles.detailPricing}>
              <h3><Sparkles size={18} />{copy.referencePricing}</h3>
              <div className={styles.detailPriceTable}>
                <div className={styles.priceTableHead}><span /><span><strong>{copy.normal}</strong><small>{copy.normalHint}</small></span><span><strong>{copy.rush}</strong><small>{copy.rushHint}</small></span></div>
                {service.referencePrices.map((price) => {
                  const rushAmount = Math.ceil((price.amountThb * 1.3) / 50) * 50;
                  return <div className={styles.detailPriceRow} key={price.usage}>
                    <span><strong>{price.usage === "commercial" ? copy.commercial : copy.personal}</strong><small>{price.label[locale]}</small></span>
                    <span><strong>{formatThb(price.amountThb)} THB</strong><small>{formatUsd(price.amountThb)}</small></span>
                    <span><strong>{formatThb(rushAmount)} THB</strong><small>{formatUsd(rushAmount)}</small></span>
                  </div>;
                })}
              </div>
              <p>* {copy.referenceNote}</p>
            </section>

            <section className={styles.detailAdditions}>
              <h3><Sparkles size={18} />{copy.additions}</h3>
              {service.modifiers.length ? <ul>{service.modifiers.map((modifier) => <li key={modifier.label.en}><span>{modifier.label[locale]}</span><strong>{formatModifier(modifier.kind, modifier.value)}</strong></li>)}</ul> : <p>{copy.noAdditions}</p>}
            </section>

            <section className={styles.detailFacts}>
              <div><Clock3 /><span><small>{copy.timing}</small><strong>{service.timingGuidance[locale]}</strong></span></div>
              <div><RotateCcw /><span><small>{copy.revisions}</small><strong>{copy.revisionsValue}</strong><em>{copy.revisionsHint}</em></span></div>
            </section>

            {service.documentSlugs[0] ? <Link className={styles.detailDocumentLink} href={`/${locale}/documents/${service.documentSlugs[0]}`}><FileText /><span>{documentNames[service.documentSlugs[0]]?.[locale] ?? copy.documents}</span><ChevronRight /></Link> : null}
          </aside>
        </div>

        <footer className={styles.detailFooter}>
          <p><Info />{copy.finalPrice}</p>
          <div><button disabled={service.availability === "closed"} onClick={() => setPreviewOpen(true)} ref={requestRef} type="button"><Sparkles />{messages.estimate}</button><button onClick={close} type="button">{messages.closeEstimate}</button></div>
        </footer>
      </section>
    </div>
    {imagePreviewOpen && example ? <div aria-label={example.media.alt[locale]} aria-modal="true" className={styles.serviceImagePreview} onClick={(event) => { if (event.target === event.currentTarget) setImagePreviewOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") setImagePreviewOpen(false); }} role="dialog" tabIndex={-1}>
      <button aria-label={messages.closeDetails} onClick={() => setImagePreviewOpen(false)} type="button"><X /></button>
      {/* eslint-disable-next-line @next/next/no-img-element -- stored full detail derivative */}
      <img alt={example.media.alt[locale]} height={example.media.height} src={example.media.detailSrc} width={example.media.width} />
    </div> : null}
    {previewOpen ? <EstimateRequestDialog locale={locale} onClose={() => setPreviewOpen(false)} service={service} /> : null}
  </>;
}

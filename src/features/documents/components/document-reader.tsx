"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import type { Locale } from "@/shared/i18n/locales";
import type { DocumentSummary } from "@/features/documents/domain/document";
import { RichTextRenderer } from "./rich-text-renderer";

import { getDocumentCategoryLabel } from "./document-category";
import styles from "./documents.module.css";

export type DocumentReaderProps = {
  document: DocumentSummary;
  mode: "route" | "dialog";
  locale?: Locale;
  onClose?: () => void;
};

const copy = {
  en: { back: "Back to documents", close: "Close document" },
  th: { back: "กลับไปที่เอกสาร", close: "ปิดเอกสาร" },
} as const;

function ReaderBody({ document, locale }: Pick<DocumentReaderProps, "document"> & { locale: Locale }) {
  return <article className={styles.readerBody}>
    <p className={styles.category}>{getDocumentCategoryLabel(locale, document.category)}</p>
    <h1>{document.title[locale]}</h1>
    <p className={styles.summary}>{document.summary[locale]}</p>
    <div className={styles.content}><RichTextRenderer document={document.content[locale]} /></div>
    <ul className={styles.tags}>{document.tags.map((tag) => <li key={tag.en}>{tag[locale]}</li>)}</ul>
  </article>;
}

export function DocumentReader({ document: item, locale = "en", mode, onClose }: DocumentReaderProps) {
  const labels = copy[locale];
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (mode !== "dialog") return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose?.(); return; }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); openerRef.current?.focus(); };
  }, [mode, onClose]);

  if (mode === "route") return <main className={styles.routeReader}>
    <Link className={styles.backLink} href={`/${locale}/documents`}>{labels.back}</Link>
    <ReaderBody document={item} locale={locale} />
  </main>;

  return <div aria-label={item.title[locale]} aria-modal="true" className={styles.backdrop} onClick={(event) => { if (event.target === event.currentTarget) onClose?.(); }} ref={dialogRef} role="dialog">
    <section className={styles.dialogReader}>
      <button aria-label={labels.close} className={styles.closeButton} onClick={onClose} ref={closeRef} type="button">×</button>
      <ReaderBody document={item} locale={locale} />
    </section>
  </div>;
}

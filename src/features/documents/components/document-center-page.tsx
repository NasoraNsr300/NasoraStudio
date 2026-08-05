"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { Locale } from "@/shared/i18n/locales";
import type { DocumentSummary } from "@/shared/types/public-content";

import { getDocumentCategoryLabel } from "./document-category";
import { DocumentReader } from "./document-reader";
import styles from "./documents.module.css";

export type DocumentCenterPageProps = { documents: DocumentSummary[]; initialQuery?: string; locale: Locale };

const copy = {
  en: { all: "All", announcement: "Terms, process notes, and public policies in one place.", empty: "No documents match that selection.", eyebrow: "Public information", pinned: "Pinned", read: "Read document", search: "Search documents", title: "Document center" },
  th: { all: "ทั้งหมด", announcement: "เงื่อนไข ขั้นตอน และนโยบายสาธารณะรวมอยู่ที่นี่", empty: "ไม่พบเอกสารที่ตรงกับการเลือก", eyebrow: "ข้อมูลสาธารณะ", pinned: "ปักหมุด", read: "อ่านเอกสาร", search: "ค้นหาเอกสาร", title: "ศูนย์เอกสาร" },
} as const;

export function DocumentCenterPage({ documents, initialQuery = "", locale }: DocumentCenterPageProps) {
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState(initialQuery);
  const [activeDocument, setActiveDocument] = useState<DocumentSummary | null>(null);
  const labels = copy[locale];
  const categories = Array.from(new Set(documents.map((document) => document.category))).sort();
  const visibleDocuments = useMemo(() => {
    const term = query.trim().toLocaleLowerCase(locale);
    return [...documents].sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.displayOrder - b.displayOrder).filter((document) =>
      (category === "all" || document.category === category) && (!term || [document.title[locale], document.summary[locale], document.content[locale]].some((value) => value.toLocaleLowerCase(locale).includes(term))));
  }, [category, documents, locale, query]);

  return <main className={styles.documents}>
    <header className={styles.heading}><p>{labels.eyebrow}</p><h1>{labels.title}</h1><span>{labels.announcement}</span></header>
    <div className={styles.controls}>
      <div aria-label={labels.title} className={styles.filters} role="group">
        <button aria-pressed={category === "all"} onClick={() => setCategory("all")} type="button">{labels.all}</button>
        {categories.map((value) => <button aria-pressed={category === value} key={value} onClick={() => setCategory(value)} type="button">{getDocumentCategoryLabel(locale, value)}</button>)}
      </div>
      <label className={styles.search}><span>{labels.search}</span><input aria-label={labels.search} onChange={(event) => setQuery(event.target.value)} placeholder={labels.search} type="search" value={query} /></label>
    </div>
    {visibleDocuments.length ? <div className={styles.documentList}>{visibleDocuments.map((document) => <article className={styles.card} key={document.slug}>
      <div><p>{document.pinned ? `★ ${labels.pinned}` : getDocumentCategoryLabel(locale, document.category)}</p><h2><Link href={`/${locale}/documents/${document.slug}`}>{document.title[locale]}</Link></h2><span>{document.summary[locale]}</span></div>
      <button onClick={() => setActiveDocument(document)} type="button">{labels.read}</button>
    </article>)}</div> : <p className={styles.empty} role="status">{labels.empty}</p>}
    {activeDocument ? <DocumentReader document={activeDocument} locale={locale} mode="dialog" onClose={() => setActiveDocument(null)} /> : null}
  </main>;
}

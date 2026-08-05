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
  const [view, setView] = useState<"list" | "grid">("list");
  const labels = copy[locale];
  const categories = Array.from(new Set(documents.map((document) => document.category))).sort();
  const visibleDocuments = useMemo(() => {
    const term = query.trim().toLocaleLowerCase(locale);
    return [...documents].sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.displayOrder - b.displayOrder).filter((document) =>
      (category === "all" || document.category === category) && (!term || [document.title[locale], document.summary[locale], document.content[locale]].some((value) => value.toLocaleLowerCase(locale).includes(term))));
  }, [category, documents, locale, query]);

  const featuredDocument = visibleDocuments.find((document) => document.pinned);
  const regularDocuments = visibleDocuments.filter((document) => document !== featuredDocument);
  const latestDocument = [...documents].sort((a, b) => b.displayOrder - a.displayOrder)[0];

  return <main className={styles.documents}>
    <div className={styles.documentHero}>
      <header className={styles.heading}><h1>{labels.title}</h1><span>{labels.announcement}</span></header>
      {latestDocument ? <aside className={styles.latestNotice}>
        <i aria-hidden="true">♢</i>
        <div><strong>{locale === "th" ? "ประกาศล่าสุด" : "Latest notice"}</strong><span>{latestDocument.title[locale]} — {latestDocument.summary[locale]}</span></div>
        <button onClick={() => setActiveDocument(latestDocument)} type="button">{locale === "th" ? "ดูรายละเอียด ›" : "View details ›"}</button>
      </aside> : null}
    </div>
    <section aria-label={locale === "th" ? "สรุปเอกสาร" : "Document summary"} className={styles.documentStats}>
      <article><i aria-hidden="true">▤</i><span><strong>{documents.length}</strong>{locale === "th" ? "เอกสารทั้งหมด" : "Documents"}<small>{locale === "th" ? "ครอบคลุมทุกหมวดหมู่" : "Across every category"}</small></span></article>
      <article><i aria-hidden="true">♢</i><span><strong>{documents.filter((document) => document.category === "terms").length}</strong>{locale === "th" ? "ข้อตกลงทางการ" : "Official terms"}<small>{locale === "th" ? "อัปเดตล่าสุดและมีผลบังคับใช้" : "Current and effective"}</small></span></article>
      <article><i aria-hidden="true">⌖</i><span><strong>{documents.filter((document) => document.pinned).length}</strong>{locale === "th" ? "เอกสารปักหมุด" : "Pinned documents"}<small>{locale === "th" ? "เอกสารสำคัญที่แนะนำ" : "Recommended reading"}</small></span></article>
    </section>
    <div className={styles.controls}>
      <div aria-label={labels.title} className={styles.filters} role="group">
        <button aria-pressed={category === "all"} onClick={() => setCategory("all")} type="button">✧ {labels.all}</button>
        {categories.map((value) => <button aria-pressed={category === value} key={value} onClick={() => setCategory(value)} type="button">◇ {getDocumentCategoryLabel(locale, value)}</button>)}
      </div>
      <div className={styles.viewToggle}>
        <button aria-label={locale === "th" ? "มุมมองรายการ" : "List view"} aria-pressed={view === "list"} onClick={() => setView("list")} type="button">☷</button>
        <button aria-label={locale === "th" ? "มุมมองตาราง" : "Grid view"} aria-pressed={view === "grid"} onClick={() => setView("grid")} type="button">▦</button>
      </div>
      <label className={styles.search}><span>{labels.search}</span><input aria-label={labels.search} onChange={(event) => setQuery(event.target.value)} placeholder={labels.search} type="search" value={query} /></label>
    </div>
    {visibleDocuments.length ? <div className={styles.documentList} data-view={view}>
      {featuredDocument ? <article className={styles.featuredCard}>
        <div className={styles.featuredCover}>
          {featuredDocument.coverMedia ? <>
            {/* Stored WebP derivative; no runtime image transformation is required. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" src={featuredDocument.coverMedia.cardSrc} />
          </> : <span aria-hidden="true">⌖</span>}
        </div>
        <div className={styles.featuredCopy}><p>⌖ {labels.pinned}</p><h2><Link href={`/${locale}/documents/${featuredDocument.slug}`}>{featuredDocument.title[locale]}</Link></h2><span>{featuredDocument.summary[locale]}</span></div>
        <div className={styles.featuredAction}><small>{getDocumentCategoryLabel(locale, featuredDocument.category)}</small><button onClick={() => setActiveDocument(featuredDocument)} type="button">{labels.read} ›</button></div>
      </article> : null}
      <div className={styles.regularDocuments}>{regularDocuments.map((document) => <article className={styles.card} key={document.slug}>
        <i aria-hidden="true">{document.category === "privacy" ? "♙" : document.category === "guide" ? "▧" : "◇"}</i>
        <div><p>{getDocumentCategoryLabel(locale, document.category)}</p><h2><Link href={`/${locale}/documents/${document.slug}`}>{document.title[locale]}</Link></h2><span>{document.summary[locale]}</span></div>
        <button aria-label={`${labels.read}: ${document.title[locale]}`} onClick={() => setActiveDocument(document)} type="button">›</button>
      </article>)}</div>
    </div> : <p className={styles.empty} role="status">{labels.empty}</p>}
    {activeDocument ? <DocumentReader document={activeDocument} locale={locale} mode="dialog" onClose={() => setActiveDocument(null)} /> : null}
  </main>;
}

"use client";

import { useMemo } from "react";

import type { Locale } from "@/shared/i18n/locales";
import type { PublicQueueItem } from "@/shared/types/public-content";

import { QueueTable } from "./queue-table";
import styles from "./queue.module.css";

export type QueuePageProps = { initialQuery?: string; items: PublicQueueItem[]; locale: Locale };

const copy = {
  en: { announcement: "Follow the public work queue with clear, up-to-date progress.", empty: "No public queue records match that search.", privacy: "Only public work status is shown to protect customer privacy.", title: "Queue" },
  th: { announcement: "ติดตามสถานะงานของคุณแบบเรียลไทม์ โปร่งใส และอัปเดตอยู่เสมอ", empty: "ไม่พบรายการคิวที่ตรงกับคำค้น", privacy: "แสดงเฉพาะสถานะงานแบบสาธารณะ เพื่อความเป็นส่วนตัวของลูกค้า", title: "คิวงาน" },
} as const;

function queueTone(status: string) {
  const value = status.toLocaleLowerCase();
  if (value.includes("เสร็จ") || value.includes("complete")) return "complete";
  if (value.includes("รอ") || value.includes("queue")) return "waiting";
  return "active";
}

export function QueuePage({ initialQuery = "", items, locale }: QueuePageProps) {
  const labels = copy[locale];
  const visibleItems = useMemo(() => {
    const term = initialQuery.trim().toLocaleLowerCase(locale);
    if (!term) return items;
    return items.filter((item) => [item.displayName, item.serviceName, item.statusLabel, item.deadlineLabel]
      .some((value) => value.toLocaleLowerCase(locale).includes(term)));
  }, [initialQuery, items, locale]);

  const summary = {
    active: items.filter((item) => queueTone(item.statusLabel) === "active").length,
    complete: items.filter((item) => queueTone(item.statusLabel) === "complete").length,
    total: items.length,
    waiting: items.filter((item) => queueTone(item.statusLabel) === "waiting").length,
  };

  return <main className={styles.queue}>
    <div className={styles.queueOverview}>
      <header className={styles.heading}>
        <h1>{labels.title}</h1>
        <span>{labels.announcement}</span>
        <small>♙ {labels.privacy}</small>
      </header>
      <section aria-label={locale === "th" ? "สรุปคิวงาน" : "Queue summary"} className={styles.summaryGrid}>
        <article><i aria-hidden="true">✦</i><span>{locale === "th" ? "คิวทั้งหมด" : "Total"}<strong>{summary.total}</strong></span></article>
        <article><i aria-hidden="true">⌛</i><span>{locale === "th" ? "กำลังดำเนินการ" : "In progress"}<strong>{summary.active}</strong></span></article>
        <article><i aria-hidden="true">◷</i><span>{locale === "th" ? "รอคิว" : "Waiting"}<strong>{summary.waiting}</strong></span></article>
        <article className={styles.completeSummary}><i aria-hidden="true">✓</i><span>{locale === "th" ? "เสร็จสิ้น" : "Complete"}<strong>{summary.complete}</strong></span></article>
      </section>
    </div>
    {visibleItems.length ? <QueueTable items={visibleItems} locale={locale} /> : <p className={styles.empty} role="status">{labels.empty}</p>}
    <div className={styles.queueInsights}>
      <section>
        <h2>{locale === "th" ? "สถานะงาน" : "Work status"}</h2>
        <div className={styles.legend}>
          <span><i data-tone="waiting" />{locale === "th" ? "รอเริ่มงาน" : "Waiting"}</span>
          <span><i data-tone="sketch" />{locale === "th" ? "กำลังร่าง" : "Sketching"}</span>
          <span><i data-tone="color" />{locale === "th" ? "ลงสี" : "Coloring"}</span>
          <span><i data-tone="review" />{locale === "th" ? "รอตรวจ" : "Review"}</span>
          <span><i data-tone="complete" />{locale === "th" ? "เสร็จแล้ว" : "Complete"}</span>
        </div>
      </section>
      <section>
        <h2>{locale === "th" ? "สถิติระยะเวลางาน (โดยเฉลี่ย)" : "Average turnaround"}</h2>
        <div className={styles.turnaround}>
          <span><i>✦</i><small>{locale === "th" ? "ภาพประกอบ" : "Illustration"}</small><strong>18–28 {locale === "th" ? "วัน" : "days"}</strong></span>
          <span><i>♙</i><small>{locale === "th" ? "ภาพครึ่งตัว" : "Half Body"}</small><strong>10–16 {locale === "th" ? "วัน" : "days"}</strong></span>
          <span><i>▧</i><small>{locale === "th" ? "งานฉาก / แบ็กกราวด์" : "Background"}</small><strong>21–35 {locale === "th" ? "วัน" : "days"}</strong></span>
          <span><i>◉</i><small>{locale === "th" ? "ชิบิ" : "Chibi"}</small><strong>5–10 {locale === "th" ? "วัน" : "days"}</strong></span>
        </div>
      </section>
    </div>
  </main>;
}

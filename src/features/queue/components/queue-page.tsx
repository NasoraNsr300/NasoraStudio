"use client";

import { useMemo, useState } from "react";

import type { Locale } from "@/shared/i18n/locales";
import type { PublicQueueItem } from "@/shared/types/public-content";

import { QueueTable } from "./queue-table";
import styles from "./queue.module.css";

export type QueuePageProps = { items: PublicQueueItem[]; locale: Locale };

const copy = {
  en: { announcement: "Live public progress overview", empty: "No public queue records match that search.", eyebrow: "Commission status", search: "Search queue", title: "Queue" },
  th: { announcement: "ภาพรวมความคืบหน้าสาธารณะ", empty: "ไม่พบรายการคิวที่ตรงกับคำค้น", eyebrow: "สถานะคอมมิชชัน", search: "ค้นหาคิว", title: "คิว" },
} as const;

export function QueuePage({ items, locale }: QueuePageProps) {
  const [query, setQuery] = useState("");
  const labels = copy[locale];
  const visibleItems = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return items;
    return items.filter((item) => [item.displayName, item.serviceName, item.statusLabel, item.deadlineLabel]
      .some((value) => value.toLocaleLowerCase().includes(term)));
  }, [items, query]);

  return <main className={styles.queue}>
    <header className={styles.heading}>
      <p>{labels.eyebrow}</p>
      <h1>{labels.title}</h1>
      <span>{labels.announcement}</span>
    </header>
    <label className={styles.search}>
      <span>{labels.search}</span>
      <input aria-label={labels.search} onChange={(event) => setQuery(event.target.value)} placeholder={labels.search} type="search" value={query} />
    </label>
    {visibleItems.length ? <QueueTable items={visibleItems} locale={locale} /> : <p className={styles.empty} role="status">{labels.empty}</p>}
  </main>;
}

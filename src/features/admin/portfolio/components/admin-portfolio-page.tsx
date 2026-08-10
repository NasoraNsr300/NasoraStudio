"use client";

import { Archive, ImagePlus, Pencil, RotateCcw, Search, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { AdminPortfolioItem } from "@/features/portfolio/domain/portfolio";

import styles from "./admin-portfolio-page.module.css";

export function AdminPortfolioPage({ items }: { items: AdminPortfolioItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("th");
    return items.filter((item) => {
      if (status === "published" && (!item.published || item.archivedAt)) return false;
      if (status === "draft" && (item.published || item.archivedAt)) return false;
      if (status === "archived" && !item.archivedAt) return false;
      if (!normalized) return true;
      return [item.title.th, item.title.en, item.categoryName.th, item.categoryName.en]
        .join(" ").toLocaleLowerCase("th").includes(normalized);
    });
  }, [items, query, status]);

  async function setArchived(item: AdminPortfolioItem, archived: boolean) {
    if (archived && !window.confirm(`เก็บผลงาน ${item.title.th} เป็นรายการถาวร?`)) return;
    setBusyId(item.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/portfolio/items/${item.id}/archive`, {
        body: JSON.stringify({ archived, reason: archived ? "Archived from Admin portfolio" : null }),
        headers: { "content-type": "application/json" }, method: "POST",
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "อัปเดตผลงานไม่สำเร็จ");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "อัปเดตผลงานไม่สำเร็จ");
    } finally { setBusyId(null); }
  }

  return <section className={styles.page}>
    <header className={styles.header}>
      <div><span><ImagePlus size={25} /></span><div><h1>ผลงาน</h1><p>รูปและชื่อจากหน้านี้ซิงค์กับ Portfolio สาธารณะ</p></div></div>
      <Link href="/admin/portfolio/new"><ImagePlus size={18} />เพิ่มผลงาน</Link>
    </header>
    <div className={styles.toolbar}>
      <label><Search size={18} /><input onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อผลงานหรือหมวดหมู่..." value={query} /></label>
      <select aria-label="กรองสถานะผลงาน" onChange={(event) => setStatus(event.target.value)} value={status}>
        <option value="all">ทั้งหมด</option><option value="published">เผยแพร่</option><option value="draft">ฉบับร่าง</option><option value="archived">เก็บถาวร</option>
      </select>
    </div>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {items.length === 0 ? <div className={styles.empty}><h2>ยังไม่มีผลงาน</h2><p>เพิ่มรูปแรกเพื่อแสดงบนหน้า Portfolio</p><Link href="/admin/portfolio/new">เพิ่มผลงาน</Link></div> : null}
    {items.length > 0 && visibleItems.length === 0 ? <div className={styles.empty}><h2>ไม่พบผลงาน</h2><p>ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p></div> : null}
    <div className={styles.grid}>{visibleItems.map((item) => <article data-archived={Boolean(item.archivedAt)} key={item.id}>
      <div className={styles.image}><Image alt={item.media.alt.th} fill sizes="(max-width: 1200px) 50vw, 25vw" src={item.media.cardSrc} />{item.featured ? <span title="ผลงานเด่น"><Star size={15} /></span> : null}</div>
      <div className={styles.info}><strong>{item.title.th}</strong><small>{item.categoryName.th}</small><em data-published={item.published && !item.archivedAt}>{item.archivedAt ? "เก็บถาวร" : item.published ? "เผยแพร่" : "ฉบับร่าง"}</em></div>
      <footer><Link aria-label={`แก้ไข ${item.title.th}`} href={`/admin/portfolio/${item.id}`}><Pencil size={16} />แก้ไข</Link>
        {item.archivedAt
          ? <button aria-label={`กู้คืน ${item.title.th}`} disabled={busyId === item.id} onClick={() => setArchived(item, false)} type="button"><RotateCcw size={16} /></button>
          : <button aria-label={`เก็บถาวร ${item.title.th}`} disabled={busyId === item.id} onClick={() => setArchived(item, true)} type="button"><Archive size={16} /></button>}
      </footer>
    </article>)}</div>
  </section>;
}

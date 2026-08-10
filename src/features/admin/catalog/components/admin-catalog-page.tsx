"use client";

import { Archive, Filter, Pencil, Plus, RotateCcw, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { AdminCatalogAlbum } from "@/features/catalog/domain/catalog";

import styles from "./admin-catalog-page.module.css";

const statusCopy = {
  closed: "ปิดรับ",
  limited: "รับจำนวนจำกัด",
  open: "เปิดรับ",
} as const;

export function AdminCatalogPage({ albums }: { albums: AdminCatalogAlbum[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("order");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const filteredAlbums = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("th");
    return albums
      .filter((album) => {
        if (filter === "active" && album.archivedAt) return false;
        if (filter === "archived" && !album.archivedAt) return false;
        if (["open", "limited", "closed"].includes(filter) && album.availability !== filter) return false;
        if (!normalized) return true;
        const searchText = [album.name.th, album.name.en, album.slug, ...album.services.flatMap((service) => [service.name.th, service.name.en])].join(" ").toLocaleLowerCase("th");
        return searchText.includes(normalized);
      })
      .sort((left, right) => sort === "name" ? left.name.th.localeCompare(right.name.th, "th") : left.displayOrder - right.displayOrder);
  }, [albums, filter, query, sort]);

  async function setArchived(album: AdminCatalogAlbum, archived: boolean) {
    if (archived && !window.confirm(`เก็บอัลบั้ม ${album.name.th} เป็นรายการถาวร?`)) return;
    setBusyId(album.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/catalog/albums/${album.id}/archive`, {
        body: JSON.stringify({ archived, reason: archived ? "Archived from Admin catalog" : null }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "อัปเดตอัลบั้มไม่สำเร็จ");
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "อัปเดตอัลบั้มไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  }

  return <section className={styles.page}>
    <header className={styles.header}>
      <div><span className={styles.headerIcon}><Filter size={25} /></span><div><h1>อัลบั้มและราคา</h1><p>จัดประเภทงาน รูปแบบย่อย เรทราคา และสถานะเปิดรับ</p></div></div>
      <Link className={styles.primaryAction} href="/admin/catalog/new"><Plus size={18} />เพิ่มอัลบั้ม</Link>
    </header>

    <div className={styles.toolbar}>
      <label><Search size={18} /><input onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาอัลบั้มหรือรูปแบบงาน..." value={query} /></label>
      <select aria-label="กรองสถานะอัลบั้ม" onChange={(event) => setFilter(event.target.value)} value={filter}>
        <option value="all">ทั้งหมด</option><option value="active">กำลังใช้งาน</option><option value="archived">เก็บถาวร</option><option value="open">เปิดรับ</option><option value="limited">รับจำนวนจำกัด</option><option value="closed">ปิดรับ</option>
      </select>
      <select aria-label="เรียงอัลบั้ม" onChange={(event) => setSort(event.target.value)} value={sort}>
        <option value="order">ลำดับแสดง</option><option value="name">ชื่ออัลบั้ม</option>
      </select>
    </div>

    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {albums.length === 0 ? <div className={styles.empty}><h2>ยังไม่มีอัลบั้ม</h2><p>เพิ่มอัลบั้มแรกเพื่อแสดงบนหน้าคอมมิชชัน</p><Link href="/admin/catalog/new">เพิ่มอัลบั้ม</Link></div> : null}
    {albums.length > 0 && filteredAlbums.length === 0 ? <div className={styles.empty}><h2>ไม่พบอัลบั้ม</h2><p>ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p></div> : null}

    <div className={styles.grid}>
      {filteredAlbums.map((album) => <article className={styles.card} data-archived={Boolean(album.archivedAt)} key={album.id}>
        <div className={styles.cover}>
          {album.coverMedia ? <Image alt={album.coverMedia.alt.th} fill sizes="25vw" src={album.coverMedia.cardSrc} /> : <span aria-hidden="true" data-catalog-cover="empty" />}
          <strong>{album.name.th}</strong>
          {album.archivedAt ? <b>เก็บถาวร</b> : null}
        </div>
        <header><div><h2>{album.name.th}</h2><small>{album.serviceCount} รูปแบบ</small></div><span data-status={album.availability}>● {statusCopy[album.availability]}</span></header>
        <footer>
          <Link aria-label={`แก้ไขอัลบั้ม ${album.name.th}`} href={`/admin/catalog/${album.id}`}><Pencil size={16} />แก้ไขอัลบั้ม</Link>
          {album.archivedAt
            ? <button aria-label={`กู้คืนอัลบั้ม ${album.name.th}`} disabled={busyId === album.id} onClick={() => setArchived(album, false)} type="button"><RotateCcw size={17} /></button>
            : <button aria-label={`เก็บอัลบั้ม ${album.name.th} เป็นรายการถาวร`} disabled={busyId === album.id} onClick={() => setArchived(album, true)} type="button"><Archive size={17} /></button>}
        </footer>
      </article>)}
    </div>
  </section>;
}


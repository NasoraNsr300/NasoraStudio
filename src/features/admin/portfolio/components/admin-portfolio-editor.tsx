"use client";

import { Archive, ArrowLeft, ImageUp, RotateCcw, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import type { AdminPortfolioItem, LocalizedPortfolioText } from "@/features/portfolio/domain/portfolio";

import styles from "./admin-portfolio-editor.module.css";

export type PortfolioAlbumOption = { id: string; name: LocalizedPortfolioText; published: boolean; slug: string };

async function json(response: Response) {
  return await response.json().catch(() => ({})) as { error?: string; itemId?: string; mediaId?: string; src?: string };
}

export function AdminPortfolioEditor({ albums, initialItem }: { albums: PortfolioAlbumOption[]; initialItem: AdminPortfolioItem | null }) {
  const router = useRouter();
  const [titleTh, setTitleTh] = useState(initialItem?.title.th ?? "");
  const [titleEn, setTitleEn] = useState(initialItem?.title.en ?? "");
  const [albumId, setAlbumId] = useState(initialItem?.albumId ?? albums[0]?.id ?? "");
  const [displayOrder, setDisplayOrder] = useState(String(initialItem?.displayOrder ?? 0));
  const [featured, setFeatured] = useState(initialItem?.featured ?? false);
  const [published, setPublished] = useState(initialItem?.published ?? false);
  const [mediaId, setMediaId] = useState(initialItem?.mediaId ?? "");
  const [src, setSrc] = useState(initialItem?.media.cardSrc ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function upload() {
    if (!file) { setError("เลือกรูปก่อนอัปโหลด"); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const bitmap = await createImageBitmap(file);
      const data = new FormData(); data.set("file", file); data.set("altTh", titleTh); data.set("altEn", titleEn);
      data.set("width", String(bitmap.width)); data.set("height", String(bitmap.height)); bitmap.close();
      const response = await fetch("/api/admin/portfolio/media", { body: data, method: "POST" });
      const body = await json(response);
      if (!response.ok || !body.mediaId) throw new Error(body.error ?? "อัปโหลดรูปไม่สำเร็จ");
      setMediaId(body.mediaId); setSrc(body.src ?? ""); setNotice("อัปโหลดรูปแล้ว");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "อัปโหลดรูปไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const order = Number(displayOrder);
      if (!mediaId) throw new Error("อัปโหลดรูปผลงานก่อนบันทึก");
      if (!albumId) throw new Error("เลือกอัลบั้มคอมมิชชัน");
      if (!Number.isInteger(order) || order < 0 || order > 10_000) throw new Error("ลำดับแสดงไม่ถูกต้อง");
      const response = await fetch(initialItem ? `/api/admin/portfolio/items/${initialItem.id}` : "/api/admin/portfolio/items", {
        body: JSON.stringify({ albumId, displayOrder: order, featured, mediaId, published, title: { en: titleEn, th: titleTh } }),
        headers: { "content-type": "application/json" }, method: initialItem ? "PATCH" : "POST",
      });
      const body = await json(response);
      if (!response.ok) throw new Error(body.error ?? "บันทึกผลงานไม่สำเร็จ");
      if (!initialItem) {
        if (!body.itemId) throw new Error("ไม่พบรหัสผลงาน");
        router.replace(`/admin/portfolio/${body.itemId}`);
      }
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "บันทึกผลงานไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  async function setArchived(archived: boolean) {
    if (!initialItem) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/portfolio/items/${initialItem.id}/archive`, { body: JSON.stringify({ archived, reason: archived ? "Archived from portfolio editor" : null }), headers: { "content-type": "application/json" }, method: "POST" });
      const body = await json(response); if (!response.ok) throw new Error(body.error ?? "อัปเดตผลงานไม่สำเร็จ"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "อัปเดตผลงานไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  return <section className={styles.page}>
    <header><div><Link aria-label="กลับหน้าผลงาน" href="/admin/portfolio"><ArrowLeft /></Link><div><small>ผลงาน</small><h1>{initialItem ? `แก้ไข ${initialItem.title.th}` : "เพิ่มผลงาน"}</h1></div></div>
      {initialItem ? initialItem.archivedAt ? <button disabled={busy} onClick={() => setArchived(false)} type="button"><RotateCcw size={17} />กู้คืน</button> : <button disabled={busy} onClick={() => setArchived(true)} type="button"><Archive size={17} />เก็บถาวร</button> : null}
    </header>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}{notice ? <p className={styles.notice}>{notice}</p> : null}
    <form onSubmit={save}><section className={styles.panel}><h2>ข้อมูลที่แสดงบน Portfolio</h2><div className={styles.fields}>
      <label>ชื่อผลงาน (TH)<input maxLength={200} onChange={(event) => setTitleTh(event.target.value)} required value={titleTh} /></label>
      <label>Title (EN)<input maxLength={200} onChange={(event) => setTitleEn(event.target.value)} required value={titleEn} /></label>
      <label>อัลบั้มคอมมิชชัน<select onChange={(event) => setAlbumId(event.target.value)} required value={albumId}><option disabled value="">เลือกอัลบั้ม</option>{albums.map((album) => <option key={album.id} value={album.id}>{album.name.th}{album.published ? "" : " (ยังไม่เผยแพร่)"}</option>)}</select></label>
      <label>ลำดับแสดง<input min="0" max="10000" onChange={(event) => setDisplayOrder(event.target.value)} required type="number" value={displayOrder} /></label>
      <div className={styles.checks}><label><input checked={published} onChange={(event) => setPublished(event.target.checked)} type="checkbox" />เผยแพร่บนหน้าเว็บ</label><label><input checked={featured} onChange={(event) => setFeatured(event.target.checked)} type="checkbox" />ผลงานเด่น</label></div>
      <div className={styles.upload}><div className={styles.preview} style={src ? { backgroundImage: `url(${src})` } : undefined}>{src ? null : <ImageUp size={40} />}</div><div><label>รูปผลงาน<input accept="image/png,image/jpeg,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" /></label><button disabled={busy || !file} onClick={upload} type="button"><ImageUp size={17} />อัปโหลดรูปผลงาน</button></div></div>
    </div><footer><Link href="/admin/portfolio">ยกเลิก</Link><button disabled={busy} type="submit"><Save size={17} />{busy ? "กำลังบันทึก..." : "บันทึกผลงาน"}</button></footer></section></form>
  </section>;
}

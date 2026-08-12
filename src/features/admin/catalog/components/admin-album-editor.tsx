"use client";

import { Archive, ArrowLeft, Plus, RotateCcw, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import type { AdminCatalogAlbum, AdminCatalogService } from "@/features/catalog/domain/catalog";
import { AdminModalShell } from "@/features/admin/modal/admin-modal-shell";
import { normalizeImageForUpload } from "@/features/media/client/normalize-image-for-upload";

import styles from "./admin-album-editor.module.css";

const variants = [
  { labelEn: "Personal Normal", labelTh: "ส่วนตัว ปกติ", pace: "normal", usage: "personal" },
  { labelEn: "Personal Rush", labelTh: "ส่วนตัว เร่ง", pace: "rush", usage: "personal" },
  { labelEn: "Commercial Normal", labelTh: "เชิงพาณิชย์ ปกติ", pace: "normal", usage: "commercial" },
  { labelEn: "Commercial Rush", labelTh: "เชิงพาณิชย์ เร่ง", pace: "rush", usage: "commercial" },
] as const;

function toSatang(value: string) {
  const match = value.trim().match(/^(\d{1,8})(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const amount = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(amount) && amount <= 2_147_483_647 ? amount : null;
}

async function responseBody(response: Response) {
  return await response.json().catch(() => ({})) as { albumId?: string; error?: string; mediaId?: string; serviceId?: string; src?: string };
}

function CatalogCoverUpload({ altEn, altTh, initialSrc, label, onUploaded }: {
  altEn: string; altTh: string; initialSrc?: string; label: string; onUploaded(mediaId: string): void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [src, setSrc] = useState(initialSrc);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function upload() {
    if (!file) { setMessage("เลือกไฟล์ภาพก่อน"); return; }
    setBusy(true); setMessage("");
    try {
      const normalized = await normalizeImageForUpload(file);
      const data = new FormData();
      data.set("file", normalized.file); data.set("altTh", altTh); data.set("altEn", altEn);
      const response = await fetch("/api/admin/catalog/media", { body: data, method: "POST" });
      const body = await responseBody(response);
      if (!response.ok || !body.mediaId) throw new Error(body.error ?? "อัปโหลดภาพไม่สำเร็จ");
      onUploaded(body.mediaId); setSrc(body.src); setMessage(`อัปโหลด${label}แล้ว`);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "อัปโหลดภาพไม่สำเร็จ"); }
    finally { setBusy(false); }
  }
  return <div className={`${styles.coverUpload} ${styles.wide}`}>
    <div className={styles.coverPreview} style={src ? { backgroundImage: `url(${src})` } : undefined}><span>{src ? "" : "ยังไม่มีภาพ"}</span></div>
    <div><label>{label}<input accept="image/png,image/jpeg,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" /></label>
      <button disabled={busy || !file} onClick={upload} type="button">{busy ? "กำลังอัปโหลด..." : `อัปโหลด${label}`}</button>
      {message ? <small>{message}</small> : null}</div>
  </div>;
}

export function AdminAlbumEditor({ initialAlbum, presentation = "page" }: { initialAlbum: AdminCatalogAlbum | null; presentation?: "modal" | "page" }) {
  const router = useRouter();
  const [nameTh, setNameTh] = useState(initialAlbum?.name.th ?? "");
  const [nameEn, setNameEn] = useState(initialAlbum?.name.en ?? "");
  const [slug, setSlug] = useState(initialAlbum?.slug ?? "");
  const [descriptionTh, setDescriptionTh] = useState(initialAlbum?.description.th ?? "");
  const [descriptionEn, setDescriptionEn] = useState(initialAlbum?.description.en ?? "");
  const [availability, setAvailability] = useState(initialAlbum?.availability ?? "open");
  const [displayOrder, setDisplayOrder] = useState(String(initialAlbum?.displayOrder ?? 0));
  const [published, setPublished] = useState(initialAlbum?.published ?? false);
  const [recommended, setRecommended] = useState(initialAlbum?.recommended ?? false);
  const [coverMediaId, setCoverMediaId] = useState(initialAlbum?.coverMedia?.id ?? null);
  const [editingService, setEditingService] = useState<AdminCatalogService | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function saveAlbum(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const order = Number(displayOrder);
      if (!Number.isInteger(order) || order < 0) throw new Error("ลำดับแสดงไม่ถูกต้อง");
      const response = await fetch(initialAlbum ? `/api/admin/catalog/albums/${initialAlbum.id}` : "/api/admin/catalog/albums", {
        body: JSON.stringify({
          availability,
          coverMediaId,
          description: { en: descriptionEn, th: descriptionTh },
          displayOrder: order,
          name: { en: nameEn, th: nameTh },
          published,
          recommended,
          slug,
        }),
        headers: { "content-type": "application/json" },
        method: initialAlbum ? "PATCH" : "POST",
      });
      const body = await responseBody(response);
      if (!response.ok) throw new Error(body.error ?? "บันทึกอัลบั้มไม่สำเร็จ");
      if (!initialAlbum) {
        if (!body.albumId) throw new Error("ไม่ได้รับรหัสอัลบั้ม");
        router.replace(`/admin/catalog/${body.albumId}`);
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "บันทึกอัลบั้มไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function setAlbumArchived(archived: boolean) {
    if (!initialAlbum) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/catalog/albums/${initialAlbum.id}/archive`, {
        body: JSON.stringify({ archived, reason: archived ? "Archived from album editor" : null }),
        headers: { "content-type": "application/json" }, method: "POST",
      });
      const body = await responseBody(response);
      if (!response.ok) throw new Error(body.error ?? "อัปเดตอัลบั้มไม่สำเร็จ");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "อัปเดตอัลบั้มไม่สำเร็จ");
    } finally { setBusy(false); }
  }

  return <section className={styles.page}>
    <header className={styles.header}>
      <div>{presentation === "page" ? <Link aria-label="กลับหน้าอัลบั้ม" href="/admin/catalog"><ArrowLeft /></Link> : null}<div><small>อัลบั้มและราคา</small><h1>{initialAlbum ? `แก้ไข ${initialAlbum.name.th}` : "เพิ่มอัลบั้ม"}</h1></div></div>
      {initialAlbum ? initialAlbum.archivedAt
        ? <button disabled={busy} onClick={() => setAlbumArchived(false)} type="button"><RotateCcw size={17} />กู้คืนอัลบั้ม</button>
        : <button disabled={busy} onClick={() => setAlbumArchived(true)} type="button"><Archive size={17} />เก็บถาวร</button> : null}
    </header>

    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    <form className={styles.albumForm} onSubmit={saveAlbum}>
      <section>
        <h2>ข้อมูลอัลบั้ม</h2>
        <div className={styles.twoColumns}>
          <label>ชื่ออัลบั้ม (TH)<input maxLength={160} onChange={(event) => setNameTh(event.target.value)} required value={nameTh} /></label>
          <label>Album name (EN)<input maxLength={160} onChange={(event) => setNameEn(event.target.value)} required value={nameEn} /></label>
          <label>Slug<input maxLength={80} onChange={(event) => setSlug(event.target.value.toLowerCase())} pattern="[a-z0-9][a-z0-9-]*" required value={slug} /></label>
          <label>สถานะเปิดรับ<select onChange={(event) => setAvailability(event.target.value as typeof availability)} value={availability}><option value="open">เปิดรับ</option><option value="limited">รับจำนวนจำกัด</option><option value="closed">ปิดรับ</option></select></label>
          <CatalogCoverUpload altEn={nameEn} altTh={nameTh} initialSrc={initialAlbum?.coverMedia?.thumbnailSrc} label="ภาพปกอัลบั้ม" onUploaded={setCoverMediaId} />
          <label className={styles.wide}>คำอธิบาย (TH)<textarea maxLength={4000} onChange={(event) => setDescriptionTh(event.target.value)} value={descriptionTh} /></label>
          <label className={styles.wide}>Description (EN)<textarea maxLength={4000} onChange={(event) => setDescriptionEn(event.target.value)} value={descriptionEn} /></label>
          <label>ลำดับแสดง<input min="0" onChange={(event) => setDisplayOrder(event.target.value)} required type="number" value={displayOrder} /></label>
          <div className={styles.checks}><label><input checked={published} onChange={(event) => setPublished(event.target.checked)} type="checkbox" />เผยแพร่บนหน้าเว็บ</label><label><input checked={recommended} onChange={(event) => setRecommended(event.target.checked)} type="checkbox" />แนะนำ</label></div>
        </div>
        <div className={styles.formActions}><button className={styles.saveButton} disabled={busy} type="submit"><Save size={17} />{busy ? "กำลังบันทึก..." : "บันทึกอัลบั้ม"}</button></div>
      </section>
    </form>

    <section className={styles.services}>
      <header><div><h2>รูปแบบย่อย</h2><p>แก้ชื่อ รายละเอียด เวลา ราคา และสถานะของแต่ละรูปแบบ</p></div><button disabled={!initialAlbum} onClick={() => setEditingService("new")} type="button"><Plus size={17} />เพิ่มรูปแบบย่อย</button></header>
      {!initialAlbum ? <p className={styles.notice}>บันทึกอัลบั้มก่อนเพิ่มรูปแบบย่อย</p> : null}
      {initialAlbum && initialAlbum.services.length === 0 ? <p className={styles.notice}>ยังไม่มีรูปแบบย่อย</p> : null}
      <div className={styles.serviceList}>{initialAlbum?.services.map((service) => <article data-archived={Boolean(service.archivedAt)} key={service.id}><div><strong>{service.name.th}</strong><span>{service.slug} · {service.prices.length} ราคา</span></div><span>{service.published && !service.archivedAt ? "เผยแพร่" : service.archivedAt ? "เก็บถาวร" : "ฉบับร่าง"}</span><button aria-label={`แก้ไขรูปแบบ ${service.name.th}`} onClick={() => setEditingService(service)} type="button">แก้ไข</button></article>)}</div>
    </section>

    {initialAlbum && editingService ? <ServiceEditor albumId={initialAlbum.id} onClose={() => setEditingService(null)} onSaved={() => { setEditingService(null); router.refresh(); }} service={editingService === "new" ? null : editingService} /> : null}
  </section>;
}

function ServiceEditor({ albumId, onClose, onSaved, service }: { albumId: string; onClose(): void; onSaved(): void; service: AdminCatalogService | null }) {
  const [nameTh, setNameTh] = useState(service?.name.th ?? "");
  const [nameEn, setNameEn] = useState(service?.name.en ?? "");
  const [slug, setSlug] = useState(service?.slug ?? "");
  const [descriptionTh, setDescriptionTh] = useState(service?.description.th ?? "");
  const [descriptionEn, setDescriptionEn] = useState(service?.description.en ?? "");
  const [timingTh, setTimingTh] = useState(service?.timingGuidance.th ?? "");
  const [timingEn, setTimingEn] = useState(service?.timingGuidance.en ?? "");
  const [availability, setAvailability] = useState(service?.availability ?? "open");
  const [revisions, setRevisions] = useState(String(service?.freeRevisionCount ?? 4));
  const [displayOrder, setDisplayOrder] = useState(String(service?.displayOrder ?? 0));
  const [published, setPublished] = useState(service?.published ?? false);
  const [coverMediaId, setCoverMediaId] = useState(service?.coverMedia?.id ?? null);
  const [prices, setPrices] = useState<Record<string, string>>(() => Object.fromEntries(variants.map((variant) => {
    const found = service?.prices.find((price) => price.usage === variant.usage && price.pace === variant.pace);
    return [`${variant.usage}:${variant.pace}`, found ? (found.amountSatang / 100).toFixed(found.amountSatang % 100 ? 2 : 0) : ""];
  })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const revisionCount = Number(revisions); const order = Number(displayOrder);
      if (!Number.isInteger(revisionCount) || revisionCount < 0 || !Number.isInteger(order) || order < 0) throw new Error("จำนวนแก้หรือลำดับไม่ถูกต้อง");
      const servicePayload = {
        availability, coverMediaId,
        description: { en: descriptionEn, th: descriptionTh }, displayOrder: order,
        documentSlugs: ["commission-terms"], freeRevisionCount: revisionCount, modifiers: [],
        name: { en: nameEn, th: nameTh }, published, slug,
        timingGuidance: { en: timingEn, th: timingTh },
      };
      const serviceResponse = await fetch(service ? `/api/admin/catalog/services/${service.id}` : `/api/admin/catalog/albums/${albumId}/services`, {
        body: JSON.stringify(service ? { ...servicePayload, albumId } : servicePayload), headers: { "content-type": "application/json" }, method: service ? "PATCH" : "POST",
      });
      const serviceBody = await responseBody(serviceResponse);
      if (!serviceResponse.ok) throw new Error(serviceBody.error ?? "บันทึกรูปแบบย่อยไม่สำเร็จ");
      const savedServiceId = service?.id ?? serviceBody.serviceId;
      if (!savedServiceId) throw new Error("ไม่ได้รับรหัสรูปแบบย่อย");
      const priceRows = variants.flatMap((variant, index) => {
        const raw = prices[`${variant.usage}:${variant.pace}`]?.trim() ?? "";
        if (!raw) return [];
        const amountSatang = toSatang(raw);
        if (amountSatang === null) throw new Error(`ราคา ${variant.labelEn} ไม่ถูกต้อง`);
        return [{ amountSatang, displayOrder: index + 1, label: { en: variant.labelEn, th: variant.labelTh }, pace: variant.pace, usage: variant.usage }];
      });
      const priceResponse = await fetch(`/api/admin/catalog/services/${savedServiceId}/prices`, { body: JSON.stringify({ prices: priceRows }), headers: { "content-type": "application/json" }, method: "PUT" });
      const priceBody = await responseBody(priceResponse);
      if (!priceResponse.ok) throw new Error(priceBody.error ?? "บันทึกราคาไม่สำเร็จ");
      onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "บันทึกรูปแบบย่อยไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  async function setArchived(archived: boolean) {
    if (!service) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/catalog/services/${service.id}/archive`, { body: JSON.stringify({ archived, reason: archived ? "Archived from service editor" : null }), headers: { "content-type": "application/json" }, method: "POST" });
      const body = await responseBody(response); if (!response.ok) throw new Error(body.error ?? "อัปเดตรูปแบบย่อยไม่สำเร็จ"); onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "อัปเดตรูปแบบย่อยไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  return <AdminModalShell mode="center" onClose={onClose} title={service ? `แก้ไข ${service.name.th}` : "เพิ่มรูปแบบย่อย"}><form aria-label={service ? `แก้ไข ${service.name.th}` : "เพิ่มรูปแบบย่อย"} className={styles.serviceEditor} onSubmit={save}>
    <header><div><h2>{service ? `แก้ไข ${service.name.th}` : "เพิ่มรูปแบบย่อย"}</h2><p>ข้อมูลนี้ซิงค์กับหน้าเว็บและแบบประเมิน</p></div></header>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    <div className={styles.twoColumns}>
      <label>ชื่อรูปแบบ (TH)<input onChange={(event) => setNameTh(event.target.value)} required value={nameTh} /></label><label>Service name (EN)<input onChange={(event) => setNameEn(event.target.value)} required value={nameEn} /></label>
      <label>Slug<input onChange={(event) => setSlug(event.target.value.toLowerCase())} pattern="[a-z0-9][a-z0-9-]*" required value={slug} /></label><label>สถานะเปิดรับ<select onChange={(event) => setAvailability(event.target.value as typeof availability)} value={availability}><option value="open">เปิดรับ</option><option value="limited">รับจำนวนจำกัด</option><option value="closed">ปิดรับ</option></select></label>
      <CatalogCoverUpload altEn={nameEn} altTh={nameTh} initialSrc={service?.coverMedia?.thumbnailSrc} label="ภาพปกรูปแบบย่อย" onUploaded={setCoverMediaId} />
      <label className={styles.wide}>รายละเอียด (TH)<textarea onChange={(event) => setDescriptionTh(event.target.value)} value={descriptionTh} /></label><label className={styles.wide}>Description (EN)<textarea onChange={(event) => setDescriptionEn(event.target.value)} value={descriptionEn} /></label>
      <label>ระยะเวลา (TH)<input onChange={(event) => setTimingTh(event.target.value)} value={timingTh} /></label><label>Timing (EN)<input onChange={(event) => setTimingEn(event.target.value)} value={timingEn} /></label>
      <label>จำนวนแก้ฟรี<input min="0" onChange={(event) => setRevisions(event.target.value)} type="number" value={revisions} /></label><label>ลำดับแสดง<input min="0" onChange={(event) => setDisplayOrder(event.target.value)} type="number" value={displayOrder} /></label>
    </div>
    <fieldset><legend>ราคาอ้างอิง</legend><div className={styles.priceGrid}>{variants.map((variant) => { const key = `${variant.usage}:${variant.pace}`; return <label key={key}>ราคา {variant.labelEn} (THB)<input inputMode="decimal" onChange={(event) => setPrices((current) => ({ ...current, [key]: event.target.value }))} placeholder="เว้นว่างถ้ายังไม่กำหนด" value={prices[key] ?? ""} /></label>; })}</div></fieldset>
    <label className={styles.publishCheck}><input checked={published} onChange={(event) => setPublished(event.target.checked)} type="checkbox" />เผยแพร่รูปแบบนี้</label>
    <footer>{service ? service.archivedAt ? <button disabled={busy} onClick={() => setArchived(false)} type="button"><RotateCcw size={16} />กู้คืน</button> : <button disabled={busy} onClick={() => setArchived(true)} type="button"><Archive size={16} />เก็บถาวร</button> : <span />}
      <div><button className={styles.saveButton} disabled={busy} type="submit"><Save size={16} />{busy ? "กำลังบันทึก..." : "บันทึกรูปแบบย่อย"}</button></div></footer>
  </form></AdminModalShell>;
}

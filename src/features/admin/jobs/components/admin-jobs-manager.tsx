"use client";

import { Clock3, PackageCheck, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminJobSummary } from "../data/admin-job-repository.server";
import { AdminModalShell } from "@/features/admin/modal/admin-modal-shell";
import styles from "../../components/admin-section-pages.module.css";

const statuses = [["waiting", "รอเริ่มงาน"], ["sketching", "กำลังร่าง"], ["coloring", "ลงสี"], ["review", "รอตรวจ"], ["delivery", "ส่งมอบ"], ["completed", "เสร็จสิ้น"], ["cancelled", "ยกเลิก"]] as const;

export function AdminJobsManager({ initialShowGuest = false, jobs }: { initialShowGuest?: boolean; jobs: AdminJobSummary[] }) {
  const router = useRouter();
  const [showGuest, setShowGuest] = useState(initialShowGuest);
  const [deliveryJobId, setDeliveryJobId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null); const data = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/jobs", { body: JSON.stringify({ deadline: data.get("deadline") || null, displayName: data.get("displayName"), serviceName: data.get("serviceName"), totalThb: Number(data.get("totalThb")) }), headers: { "content-type": "application/json" }, method: "POST" });
    setPending(false); if (!response.ok) return setError("เพิ่มคิว Guest ไม่สำเร็จ"); setShowGuest(false); router.refresh();
  }
  async function changeStatus(jobId: string, statusKey: string) {
    setPending(true); setError(null); const response = await fetch(`/api/admin/jobs/${jobId}/status`, { body: JSON.stringify({ publicNote: null, statusKey }), headers: { "content-type": "application/json" }, method: "POST" });
    setPending(false); if (!response.ok) return setError("อัปเดตสถานะไม่สำเร็จ"); router.refresh();
  }
  async function createDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!deliveryJobId) return; setPending(true); setError(null);
    const data = new FormData(event.currentTarget); const file = data.get("file"); const url = String(data.get("url") ?? "").trim();
    const response = file instanceof File && file.size > 0
      ? await fetch(`/api/admin/jobs/${deliveryJobId}/deliveries`, { body: data, method: "POST" })
      : await fetch(`/api/admin/jobs/${deliveryJobId}/deliveries`, { body: JSON.stringify({ displayName: String(data.get("displayName") || "Google Drive"), kind: "google_drive", url }), headers: { "content-type": "application/json" }, method: "POST" });
    setPending(false); if (!response.ok) return setError("เพิ่มไฟล์ส่งงานไม่สำเร็จ กรุณาตรวจ URL หรือขนาดไฟล์"); setDeliveryJobId(null); router.refresh();
  }
  const tone = (key: string) => key === "completed" || key === "cancelled" ? "complete" : key === "review" || key === "delivery" ? "review" : key === "waiting" ? "waiting" : "active";
  const columns = [{ key: "waiting", title: "รอเริ่มงาน" }, { key: "active", title: "กำลังทำ" }, { key: "review", title: "รอตรวจ" }, { key: "complete", title: "เสร็จสิ้น" }];

  return <section className={styles.sectionPage}>
    <header className={styles.pageHeader}><div><span><Clock3 size={25} /></span><div><h1>งานและคิว</h1><p>จัดลำดับคิว อัปเดตขั้นตอน ความคืบหน้า และส่งมอบงาน</p></div></div><button className={styles.primaryAction} onClick={() => setShowGuest(true)} type="button"><Plus size={18} />เพิ่มคิว Guest</button></header>
    {showGuest ? <AdminModalShell mode="center" onClose={() => setShowGuest(false)} title="เพิ่มงาน Guest"><form className={`${styles.dataPanel} ${styles.modalForm}`} onSubmit={createGuest}><h2>เพิ่มงาน Guest</h2><label>ชื่อลูกค้า<input name="displayName" required /></label><label>ประเภทงาน<input name="serviceName" required /></label><label>เดดไลน์<input name="deadline" type="date" /></label><label>ราคารวม THB<input min="0" name="totalThb" required step="0.01" type="number" /></label><div><button className={styles.primaryAction} disabled={pending} type="submit">บันทึกคิว</button></div></form></AdminModalShell> : null}
    {deliveryJobId ? <AdminModalShell mode="center" onClose={() => setDeliveryJobId(null)} title="ส่งมอบงาน"><form className={`${styles.dataPanel} ${styles.modalForm}`} onSubmit={createDelivery}><h2>ส่งมอบงาน</h2><p>เลือกอย่างใดอย่างหนึ่ง: ลิงก์ Google Drive หรือไฟล์ไม่เกิน 25 MB</p><label>ชื่อที่แสดง<input defaultValue="Google Drive" name="displayName" /></label><label>Google Drive URL<input name="url" placeholder="https://drive.google.com/..." type="url" /></label><label>หรืออัปโหลดไฟล์<input accept=".zip,.pdf,.png,.jpg,.jpeg,.webp,.psd" name="file" type="file" /></label><div><button className={styles.primaryAction} disabled={pending} type="submit">บันทึกการส่งงาน</button></div></form></AdminModalShell> : null}
    {error ? <p role="alert">{error}</p> : null}
    <div className={styles.jobBoard}>{columns.map((column) => { const items = jobs.filter((job) => tone(job.statusKey) === column.key); return <section key={column.key}><header><h2>{column.title}</h2><b>{items.length}</b></header>{items.map((job) => <article key={job.id}><strong>{job.customerDisplayName} — {job.serviceName.th}</strong><span>กำหนดส่ง {job.deadline ?? "—"}</span><select aria-label={`เปลี่ยนสถานะ ${job.customerDisplayName}`} disabled={pending || job.statusKey === "completed" || job.statusKey === "cancelled"} onChange={(event) => void changeStatus(job.id, event.target.value)} value={job.statusKey}>{statuses.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>{job.customerType === "member" ? <button onClick={() => setDeliveryJobId(job.id)} type="button"><PackageCheck size={15} />ส่งงาน</button> : null}</article>)}</section>; })}</div>
  </section>;
}

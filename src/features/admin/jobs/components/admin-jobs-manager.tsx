"use client";

import { Clock3, Plus } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminJobSummary } from "../data/admin-job-repository.server";
import styles from "../../components/admin-section-pages.module.css";

const statuses = [["waiting", "รอเริ่มงาน"], ["sketching", "กำลังร่าง"], ["coloring", "ลงสี"], ["review", "รอตรวจ"], ["delivery", "ส่งมอบ"], ["completed", "เสร็จสิ้น"], ["cancelled", "ยกเลิก"]] as const;

export function AdminJobsManager({ jobs }: { jobs: AdminJobSummary[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function createGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null);
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ deadline: data.get("deadline") || null, displayName: data.get("displayName"), serviceName: data.get("serviceName"), totalThb: Number(data.get("totalThb")) }) });
    setPending(false); if (!response.ok) return setError("เพิ่มคิว Guest ไม่สำเร็จ"); setShowForm(false); router.refresh();
  }
  async function changeStatus(jobId: string, statusKey: string) {
    setPending(true); setError(null);
    const response = await fetch(`/api/admin/jobs/${jobId}/status`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ publicNote: null, statusKey }) });
    setPending(false); if (!response.ok) return setError("อัปเดตสถานะไม่สำเร็จ"); router.refresh();
  }
  const tone = (key: string) => key === "completed" || key === "cancelled" ? "complete" : key === "review" || key === "delivery" ? "review" : key === "waiting" ? "waiting" : "active";
  const columns = [{ key: "waiting", title: "รอเริ่มงาน" }, { key: "active", title: "กำลังทำ" }, { key: "review", title: "รอตรวจ" }, { key: "complete", title: "เสร็จสิ้น" }];
  return <section className={styles.sectionPage}>
    <header className={styles.pageHeader}><div><span><Clock3 size={25} /></span><div><h1>งานและคิว</h1><p>จัดลำดับคิว อัปเดตขั้นตอนทำงาน เดดไลน์ และความคืบหน้า</p></div></div><button className={styles.primaryAction} onClick={() => setShowForm(true)} type="button"><Plus size={18} />เพิ่มคิว Guest</button></header>
    {showForm ? <form className={styles.dataPanel} onSubmit={createGuest}><h2>เพิ่มงาน Guest</h2><label>ชื่อลูกค้า<input name="displayName" required /></label><label>ประเภทงาน<input name="serviceName" required /></label><label>เดดไลน์<input name="deadline" type="date" /></label><label>ราคารวม THB<input min="0" name="totalThb" required step="0.01" type="number" /></label><div><button className={styles.primaryAction} disabled={pending} type="submit">บันทึกคิว</button><button onClick={() => setShowForm(false)} type="button">ยกเลิก</button></div></form> : null}
    {error ? <p role="alert">{error}</p> : null}
    <div className={styles.jobBoard}>{columns.map((column) => { const items = jobs.filter((job) => tone(job.statusKey) === column.key); return <section key={column.key}><header><h2>{column.title}</h2><b>{items.length}</b></header>{items.map((job) => <article key={job.id}><strong>{job.customerDisplayName} — {job.serviceName.th}</strong><span>กำหนดส่ง {job.deadline ?? "—"}</span><select aria-label={`เปลี่ยนสถานะ ${job.customerDisplayName}`} disabled={pending || job.statusKey === "completed" || job.statusKey === "cancelled"} onChange={(event) => void changeStatus(job.id, event.target.value)} value={job.statusKey}>{statuses.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></article>)}</section>; })}</div>
  </section>;
}

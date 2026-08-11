import { CalendarDays, ChevronDown, ChevronRight, ClipboardList, FileText, MessageSquare, PenLine, Plus, WalletCards } from "lucide-react";
import Link from "next/link";

import { AdminPersonalNoteModal } from "@/features/admin/dashboard/components/admin-personal-note-modal";
import type { AdminDashboardViewModel } from "@/features/admin/dashboard/domain/admin-dashboard";
import { CommissionAvailabilityToggle } from "@/features/site-settings/components/commission-availability-toggle";

import styles from "./admin-dashboard.module.css";

function Avatar({ name }: { name: string }) {
  return <span aria-hidden="true" className={styles.avatarMini}>{name.trim().charAt(0).toUpperCase() || "?"}</span>;
}

function formatMoney(satang: number | null) {
  if (satang == null) return "ไม่ระบุ";
  return new Intl.NumberFormat("th-TH", { currency: "THB", maximumFractionDigits: 0, style: "currency" }).format(satang / 100);
}

function formatDate(value: string | null) {
  if (!value) return "ยังไม่กำหนด";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00+07:00`) : new Date(value);
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok", year: "numeric" }).format(date);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", hour: "2-digit", minute: "2-digit", month: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));
}

function slipKind(kind: "deposit" | "installment" | "final") {
  return kind === "deposit" ? "มัดจำ" : kind === "installment" ? "ชำระเพิ่มเติม" : "ยอดสุดท้าย";
}

export function AdminDashboard({ dashboard }: { dashboard: AdminDashboardViewModel }) {
  const summaryCards = [
    ["รอประเมิน", dashboard.counts.submittedEstimates, "แบบประเมินที่รอตรวจ", ClipboardList, "violet"],
    ["สลิปรอตรวจสอบ", dashboard.counts.pendingSlips, "รายการชำระเงินใหม่", FileText, "gold"],
    ["งานที่กำลังดำเนินการ", dashboard.counts.activeJobs, `คิววันนี้ ${dashboard.todayJobs.length} งาน`, WalletCards, "green"],
    ["ข้อความยังไม่อ่าน", dashboard.counts.unreadMessages, "นับจากข้อความจริง", MessageSquare, "blue"],
  ] as const;

  return <>
    <section className={styles.primaryColumn}>
      <div className={styles.pageHeading}>
        <h1>ภาพรวมวันนี้</h1><CalendarDays size={19} /><span>{formatDate(new Date().toISOString())}</span><ChevronDown size={16} />
      </div>
      <div className={styles.summaryGrid}>{summaryCards.map(([label, value, note, Icon, tone]) => <article className={styles.summaryCard} key={label}>
        <span className={styles.summaryIcon} data-tone={tone}><Icon size={27} /></span>
        <div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
      </article>)}</div>

      <div className={styles.middleGrid}>
        <section className={styles.panel}>
          <h2>แบบประเมินล่าสุด</h2>
          <table className={styles.estimatesTable}>
            <thead><tr><th>ลูกค้า</th><th>ประเภทงาน</th><th>งบประมาณ</th><th>เวลาที่ส่ง</th><th>จัดการ</th></tr></thead>
            <tbody>{dashboard.recentEstimates.length ? dashboard.recentEstimates.map((estimate) => <tr key={estimate.id}>
              <td><Avatar name={estimate.customerDisplayName} />{estimate.customerDisplayName}</td>
              <td>{estimate.serviceName.th}</td>
              <td>{formatMoney(estimate.budgetMaxSatang ?? estimate.budgetMinSatang)}</td>
              <td>{formatDateTime(estimate.submittedAt)}</td>
              <td><Link className={styles.tableAction} href="/admin/estimates">ประเมิน</Link></td>
            </tr>) : <tr><td className={styles.emptyTable} colSpan={5}>ยังไม่มีแบบประเมินใหม่</td></tr>}</tbody>
          </table>
          <Link className={styles.viewAll} href="/admin/estimates">ดูทั้งหมด ({dashboard.recentEstimates.length}) <ChevronRight size={16} /></Link>
        </section>

        <section className={`${styles.panel} ${styles.slips}`}>
          <div className={styles.panelHeading}><h2>ตรวจสอบสลิป</h2><Link href="/admin/payments">ดูทั้งหมด ({dashboard.counts.pendingSlips})</Link></div>
          {dashboard.pendingSlips.length ? dashboard.pendingSlips.map((slip) => <article key={slip.id}>
            <Avatar name={slip.requestId} />
            <div><strong>คำขอ {slip.requestId.slice(0, 8)}</strong><small>{slipKind(slip.kind)}</small><span>อัปโหลด {formatDateTime(slip.uploadedAt)}</span></div>
            <div className={styles.slipAmount}><strong>{formatMoney(slip.amountSatang)}</strong><small>{slipKind(slip.kind)}</small></div>
            <div className={styles.slipActions}><Link href="/admin/payments">ตรวจสอบ</Link></div>
          </article>) : <p className={styles.emptyPanel}>ยังไม่มีสลิปรอตรวจสอบ</p>}
        </section>
      </div>

      <section className={`${styles.panel} ${styles.queuePanel}`}>
        <div className={styles.queueHeader}><h2>คิวงาน</h2><div><select aria-label="เรียงคิว" defaultValue="deadline"><option value="deadline">เรียงตาม: กำหนดเสร็จ (เร็วสุด)</option></select><Link href="/admin/jobs?new=guest"><Plus size={19} />เพิ่มคิว Guest</Link></div></div>
        <table aria-label="คิวงานปัจจุบัน" className={styles.queueTable}>
          <thead><tr><th aria-label="จัดลำดับ">⠿</th><th>ลูกค้า</th><th>ประเภทงาน</th><th>สถานะ</th><th>กำหนดเสร็จ</th><th>ความคืบหน้า</th><th>จัดการ</th></tr></thead>
          <tbody>{dashboard.activeJobs.length ? dashboard.activeJobs.map((job) => <tr key={job.id}>
            <td>⠿</td><td><Avatar name={job.customerDisplayName} />{job.customerDisplayName}</td><td>{job.serviceName.th}</td>
            <td><span className={styles.statusButton}>{job.statusLabel.th}</span></td><td>{formatDate(job.deadline)}</td>
            <td><span className={styles.progressValue}>{job.progressPercent}%</span><span className={styles.progressTrack}><i style={{ width: `${job.progressPercent}%` }} /></span></td>
            <td><Link className={styles.editButton} href="/admin/jobs"><PenLine size={15} />แก้ไข</Link></td>
          </tr>) : <tr><td className={styles.emptyTable} colSpan={7}>ยังไม่มีงานในคิว</td></tr>}</tbody>
        </table>
      </section>
    </section>

    <aside className={styles.rightRail}>
      <section className={styles.railPanel}>
        <h2>สถานะการรับงาน</h2>
        <p className={styles.openState}>{dashboard.settings.commissionsOpen ? "● เปิดรับงาน" : "● ปิดรับงาน"}</p>
        <CommissionAvailabilityToggle className={styles.railToggle} initialOpen={dashboard.settings.commissionsOpen} showStatusLabel />
      </section>
      <section className={styles.railPanel}>
        <div className={styles.railTitle}><h2>คิวงานวันนี้</h2><b>{dashboard.todayJobs.length} งาน</b></div>
        {dashboard.todayJobs.length ? <ul className={styles.todayQueue}>{dashboard.todayJobs.map((job) => <li key={job.id}><time>{job.deadline ? "วันนี้" : "—"}</time><span>{job.customerDisplayName}</span><small>{job.statusLabel.th}</small></li>)}</ul> : <p>วันนี้ยังไม่มีงานครบกำหนด</p>}
        <Link href="/admin/jobs">ดูคิวทั้งหมด <ChevronRight size={16} /></Link>
      </section>
      <section className={styles.railPanel}>
        <h2>ภาระงาน (Workload)</h2>
        <div className={styles.workload}><span className={styles.gauge} style={{ background: `conic-gradient(#8e66e7 0 ${dashboard.workload.percent}%, #26344e ${dashboard.workload.percent}% 100%)` }}><strong>{dashboard.workload.percent}%</strong></span><p>ของความสามารถ<br />({dashboard.workload.active} / {dashboard.workload.capacity} คิว)</p></div>
        <ul className={styles.workloadLegend}><li><i data-tone="violet" />งานที่ดำเนินการ <b>{dashboard.workload.active}</b></li><li><i data-tone="gold" />คิววันนี้ <b>{dashboard.todayJobs.length}</b></li><li><i data-tone="muted" />ว่างรับเพิ่ม <b>{Math.max(0, dashboard.workload.capacity - dashboard.workload.active)}</b></li></ul>
      </section>
      <AdminPersonalNoteModal initialNote={dashboard.personalNote} />
    </aside>
  </>;
}

import { FileText } from "lucide-react";

import { AdminEstimateDetail } from "@/features/admin/estimates/components/admin-estimate-detail";
import { AdminEstimateInbox } from "@/features/admin/estimates/components/admin-estimate-inbox";
import type { AdminEstimateDetail as AdminEstimateDetailModel, AdminEstimateSummary } from "@/features/admin/estimates/domain/admin-estimate";
import { AdminJobsManager } from "@/features/admin/jobs/components/admin-jobs-manager";
import type { AdminJobSummary } from "@/features/admin/jobs/data/admin-job-repository.server";

import styles from "./admin-section-pages.module.css";

export function AdminEstimatesPage({ detail, requests = [] }: { detail?: AdminEstimateDetailModel | null; requests?: AdminEstimateSummary[] }) {
  const submittedCount = requests.filter((request) => request.status === "submitted").length;
  const quotedCount = requests.filter((request) => request.status === "quoted").length;
  const convertedCount = requests.filter((request) => request.status === "converted").length;

  return <section className={styles.sectionPage}>
    <header className={styles.pageHeader}><div><span><FileText size={25} /></span><div><h1>แบบประเมิน</h1><p>ตรวจแบบประเมิน กำหนดราคาจริง และส่งข้อเสนอให้ลูกค้า</p></div></div></header>
    <div className={styles.metricRow}><article><small>รอประเมิน</small><strong>{submittedCount}</strong><span>จากแบบประเมินทั้งหมด {requests.length} รายการ</span></article><article><small>ส่งราคาแล้ว</small><strong>{quotedCount}</strong><span>รอลูกค้าตอบรับ</span></article><article><small>ยืนยันแล้ว</small><strong>{convertedCount}</strong><span>รายการที่เปลี่ยนเป็นงานแล้ว</span></article></div>
    <AdminEstimateInbox requests={requests} />
    {detail && <AdminEstimateDetail request={detail} />}
  </section>;
}

export function AdminJobsPage({ initialShowGuest = false, jobs = [] }: { initialShowGuest?: boolean; jobs?: AdminJobSummary[] }) {
  return <AdminJobsManager initialShowGuest={initialShowGuest} jobs={jobs} />;
}

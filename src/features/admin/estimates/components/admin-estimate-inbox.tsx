"use client";

import { ChevronDown, Filter, PenLine, Search, UserRound } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { AdminEstimateStatus, AdminEstimateSummary } from "@/features/admin/estimates/domain/admin-estimate";
import styles from "@/features/admin/components/admin-section-pages.module.css";

type StatusPresentation = { label: string; tone: "danger" | "neutral" | "success" | "violet" | "warning" };

const statusPresentation: Record<AdminEstimateStatus, StatusPresentation> = {
  cancelled: { label: "ยกเลิก", tone: "neutral" },
  closed: { label: "ปิดงาน", tone: "neutral" },
  converted: { label: "ยืนยันแล้ว", tone: "success" },
  declined: { label: "ปฏิเสธ", tone: "danger" },
  quoted: { label: "ส่งราคาแล้ว", tone: "violet" },
  reviewing: { label: "กำลังประเมิน", tone: "warning" },
  submitted: { label: "รอประเมิน", tone: "warning" },
};

function formatBudget({ budgetMaxSatang, budgetMinSatang }: AdminEstimateSummary) {
  const format = (satang: number) => `฿${new Intl.NumberFormat("th-TH").format(satang / 100)}`;
  if (budgetMinSatang !== null && budgetMaxSatang !== null) return `${format(budgetMinSatang)} – ${format(budgetMaxSatang)}`;
  if (budgetMinSatang !== null) return `ตั้งแต่ ${format(budgetMinSatang)}`;
  if (budgetMaxSatang !== null) return `ไม่เกิน ${format(budgetMaxSatang)}`;
  return "ไม่ระบุ";
}

function formatSubmittedAt(submittedAt: string) {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(new Date(submittedAt));
}

export function AdminEstimateInbox({
  requests,
}: {
  requests: AdminEstimateSummary[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const openedRequestId = searchParams.get("request");
  const openedRequest = requests.find((request) => request.id === openedRequestId);

  function openRequest(request: AdminEstimateSummary) {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("request", request.id);
    router.push(`${pathname}?${nextSearchParams.toString()}`);
  }

  function closePreview() {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete("request");
    const query = nextSearchParams.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return <>
    <section className={styles.dataPanel}>
      <div className={styles.toolbar}>
        <label><Search size={18} /><input placeholder="ค้นหาชื่อลูกค้า หรือเลขแบบประเมิน..." /></label>
        <button type="button"><Filter size={17} />ตัวกรอง</button>
        <button type="button">ล่าสุด<ChevronDown size={16} /></button>
      </div>
      <table>
        <thead><tr><th>ลูกค้า</th><th>ประเภทงาน</th><th>งบที่แจ้ง</th><th>วันที่ส่ง</th><th>สถานะ</th><th>จัดการ</th></tr></thead>
        <tbody>
          {requests.length === 0
            ? <tr><td colSpan={6}>ยังไม่มีแบบประเมินในรายการนี้</td></tr>
            : requests.map((request) => {
              const status = statusPresentation[request.status];
              return <tr aria-selected={openedRequestId === request.id} key={request.id}>
                <td><UserRound size={17} /><span>{request.customerDisplayName}<small>{request.requestCode}</small></span></td>
                <td>{request.serviceName.en}</td>
                <td>{formatBudget(request)}</td>
                <td>{formatSubmittedAt(request.submittedAt)}</td>
                <td><span className={styles.status} data-tone={status.tone}>● {status.label}</span></td>
                <td><button aria-label={`ประเมิน ${request.requestCode}`} className={styles.rowAction} onClick={() => openRequest(request)} type="button"><PenLine size={15} />ประเมิน</button></td>
              </tr>;
            })}
        </tbody>
      </table>
    </section>
    {openedRequest && <section aria-label={`ตัวอย่างแบบประเมิน ${openedRequest.requestCode}`} className={styles.dataPanel} role="region">
      <div className={styles.toolbar}><strong>แบบประเมิน {openedRequest.requestCode}</strong><button onClick={closePreview} type="button">กลับไปรายการ</button></div>
      <table>
        <tbody>
          <tr><th scope="row">ลูกค้า</th><td>{openedRequest.customerDisplayName}</td></tr>
          <tr><th scope="row">ประเภทงาน</th><td>{openedRequest.serviceName.en}</td></tr>
          <tr><th scope="row">งบที่แจ้ง</th><td>{formatBudget(openedRequest)}</td></tr>
          <tr><th scope="row">วันที่ส่ง</th><td>{formatSubmittedAt(openedRequest.submittedAt)}</td></tr>
          <tr><th scope="row">สถานะ</th><td><span className={styles.status} data-tone={statusPresentation[openedRequest.status].tone}>● {statusPresentation[openedRequest.status].label}</span></td></tr>
        </tbody>
      </table>
    </section>}
  </>;
}

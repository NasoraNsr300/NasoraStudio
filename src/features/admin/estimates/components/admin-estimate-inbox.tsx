"use client";

import { ChevronDown, Filter, PenLine, Search, UserRound } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import type { AdminEstimateStatus, AdminEstimateSummary } from "@/features/admin/estimates/domain/admin-estimate";
import { adminEstimateStatusPresentation } from "@/features/admin/estimates/domain/admin-estimate-status-presentation";
import styles from "@/features/admin/components/admin-section-pages.module.css";

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
  const [query, setQuery] = useState("");
  const [requesterFilter, setRequesterFilter] = useState<"all" | "guest" | "member">("all");
  const [newestFirst, setNewestFirst] = useState(true);
  const visibleRequests = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("th");
    return requests
      .filter((request) => requesterFilter === "all" || request.requesterType === requesterFilter)
      .filter((request) => !needle || [request.customerDisplayName, request.requestCode, request.serviceName.en, request.serviceName.th].some((value) => value.toLocaleLowerCase("th").includes(needle)))
      .toSorted((left, right) => (newestFirst ? -1 : 1) * left.submittedAt.localeCompare(right.submittedAt));
  }, [newestFirst, query, requesterFilter, requests]);

  function openRequest(request: AdminEstimateSummary) {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("request", request.id);
    router.push(`${pathname}?${nextSearchParams.toString()}`);
  }

  return <>
    <section className={styles.dataPanel}>
      <div className={styles.toolbar}>
        <label><Search size={18} /><input aria-label="ค้นหาแบบประเมิน" onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อลูกค้า หรือเลขแบบประเมิน..." type="search" value={query} /></label>
        <button aria-label={`ตัวกรอง: ${requesterFilter === "all" ? "ทั้งหมด" : requesterFilter === "member" ? "สมาชิก" : "Guest"}`} onClick={() => setRequesterFilter((current) => current === "all" ? "member" : current === "member" ? "guest" : "all")} type="button"><Filter size={17} />{requesterFilter === "all" ? "ทั้งหมด" : requesterFilter === "member" ? "สมาชิก" : "Guest"}</button>
        <button aria-label={newestFirst ? "ล่าสุด" : "เก่าสุด"} onClick={() => setNewestFirst((current) => !current)} type="button">{newestFirst ? "ล่าสุด" : "เก่าสุด"}<ChevronDown size={16} /></button>
      </div>
      <table>
        <thead><tr><th>ลูกค้า</th><th>ประเภทงาน</th><th>งบที่แจ้ง</th><th>วันที่ส่ง</th><th>สถานะ</th><th>จัดการ</th></tr></thead>
        <tbody>
          {visibleRequests.length === 0
            ? <tr><td colSpan={6}>ยังไม่มีแบบประเมินในรายการนี้</td></tr>
            : visibleRequests.map((request) => {
              const status = adminEstimateStatusPresentation[request.status];
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
  </>;
}

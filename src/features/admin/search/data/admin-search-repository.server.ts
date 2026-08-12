import "server-only";

import { listAdminEstimateRequests } from "@/features/admin/estimates/data/admin-estimate-repository.server";
import { listAdminJobs } from "@/features/admin/jobs/data/admin-job-repository.server";
import { listAdminPendingSlips } from "@/features/admin/notifications/data/admin-notification-repository.server";

type Estimate = { customerDisplayName: string; id: string; requestCode: string; serviceName: { th: string } };
type Job = { customerDisplayName: string; id: string; serviceName: { th: string }; statusLabel: { th: string } };
type Slip = { id: string; requestId: string };
type Dependencies = { listEstimates(): Promise<Estimate[]>; listJobs(): Promise<Job[]>; listSlips(): Promise<Slip[]> };
export type AdminSearchResult = { detail: string; group: "การชำระเงิน" | "งาน" | "แบบประเมิน"; href: string; id: string; title: string };

const defaultDependencies: Dependencies = { listEstimates: listAdminEstimateRequests, listJobs: listAdminJobs, listSlips: listAdminPendingSlips };

export async function searchAdminRecords(query: string, dependencies: Dependencies = defaultDependencies): Promise<AdminSearchResult[]> {
  const needle = query.trim().toLocaleLowerCase("th-TH");
  if (!needle) return [];
  const [estimates, jobs, slips] = await Promise.all([dependencies.listEstimates(), dependencies.listJobs(), dependencies.listSlips()]);
  const match = (...values: string[]) => values.some((value) => value.toLocaleLowerCase("th-TH").includes(needle));
  return [
    ...estimates.filter((row) => match(row.customerDisplayName, row.requestCode, row.serviceName.th)).map((row) => ({ detail: `${row.requestCode} · ${row.serviceName.th}`, group: "แบบประเมิน" as const, href: "/admin/estimates", id: `estimate-${row.id}`, title: row.customerDisplayName })),
    ...jobs.filter((row) => match(row.customerDisplayName, row.serviceName.th, row.statusLabel.th)).map((row) => ({ detail: `${row.serviceName.th} · ${row.statusLabel.th}`, group: "งาน" as const, href: "/admin/jobs", id: `job-${row.id}`, title: row.customerDisplayName })),
    ...slips.filter((row) => match(row.id, row.requestId)).map((row) => ({ detail: `คำขอ ${row.requestId.slice(0, 8)}`, group: "การชำระเงิน" as const, href: "/admin/payments", id: `slip-${row.id}`, title: "สลิปรอตรวจสอบ" })),
  ].slice(0, 50);
}

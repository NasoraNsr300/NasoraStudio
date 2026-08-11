import "server-only";

import { listAdminEstimateRequests } from "@/features/admin/estimates/data/admin-estimate-repository.server";
import type { AdminEstimateSummary } from "@/features/admin/estimates/domain/admin-estimate";
import { listAdminJobs, type AdminJobSummary } from "@/features/admin/jobs/data/admin-job-repository.server";
import type { AdminDashboardSlip, AdminDashboardViewModel } from "@/features/admin/dashboard/domain/admin-dashboard";
import { createAdminPaymentRepository, type AdminPaymentClient } from "@/features/payments/data/admin-payment-repository.server";
import { getAdminSiteSettings } from "@/features/site-settings/data/admin-site-settings-repository.server";
import type { AdminSiteSettings } from "@/features/site-settings/domain/site-settings";
import { isNasoraAdmin } from "@/shared/auth/admin-access";
import { createClient } from "@/shared/supabase/server";

type DashboardDependencies = {
  listEstimates(): Promise<AdminEstimateSummary[]>;
  listJobs(): Promise<AdminJobSummary[]>;
  listPendingSlips(): Promise<AdminDashboardSlip[]>;
  loadSettings(): Promise<AdminSiteSettings>;
};

const progressByStatus: Record<string, number> = {
  cancelled: 0,
  coloring: 55,
  completed: 100,
  delivery: 90,
  review: 75,
  sketching: 30,
  waiting: 0,
};

function localDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Bangkok",
    year: "numeric",
  }).format(date);
}

async function listPendingSlips(): Promise<AdminDashboardSlip[]> {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !isNasoraAdmin(data.user)) throw new Error("Admin access required");
  const rows = await createAdminPaymentRepository(client as unknown as AdminPaymentClient).listPending({ limit: 25 });
  return rows.map((row) => ({ amountSatang: row.amountSatang, id: row.id, kind: row.kind, requestId: row.requestId, uploadedAt: row.uploadedAt }));
}

const defaultDependencies: DashboardDependencies = {
  listEstimates: listAdminEstimateRequests,
  listJobs: listAdminJobs,
  listPendingSlips,
  loadSettings: getAdminSiteSettings,
};

export async function getAdminDashboard(dependencies: DashboardDependencies = defaultDependencies): Promise<AdminDashboardViewModel> {
  const [estimates, jobs, slips, settings] = await Promise.all([
    dependencies.listEstimates(),
    dependencies.listJobs(),
    dependencies.listPendingSlips(),
    dependencies.loadSettings(),
  ]);
  const activeJobs = jobs
    .filter((job) => !["cancelled", "completed"].includes(job.statusKey))
    .map((job) => ({ ...job, progressPercent: progressByStatus[job.statusKey] ?? 0 }));
  const today = localDateKey(new Date());
  const capacity = settings.queueCapacity;
  const active = activeJobs.length;

  return {
    activeJobs,
    counts: {
      activeJobs: active,
      pendingSlips: slips.length,
      submittedEstimates: estimates.filter((estimate) => estimate.status === "submitted").length,
      unreadMessages: 0,
    },
    pendingSlips: slips.slice(0, 2),
    personalNote: settings.adminNote,
    recentEstimates: estimates.slice(0, 4),
    settings,
    todayJobs: activeJobs.filter((job) => job.deadline === today),
    workload: {
      active,
      capacity,
      percent: Math.min(100, Math.round((active / capacity) * 100)),
    },
  };
}

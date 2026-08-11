import type { AdminEstimateSummary } from "@/features/admin/estimates/domain/admin-estimate";
import type { AdminJobSummary } from "@/features/admin/jobs/data/admin-job-repository.server";
import type { AdminSiteSettings } from "@/features/site-settings/domain/site-settings";

export type AdminDashboardJob = AdminJobSummary & {
  progressPercent: number;
};

export type AdminDashboardSlip = {
  amountSatang: number;
  id: string;
  kind: "deposit" | "installment" | "final";
  requestId: string;
  uploadedAt: string;
};

export type AdminDashboardViewModel = {
  activeJobs: AdminDashboardJob[];
  counts: {
    activeJobs: number;
    pendingSlips: number;
    submittedEstimates: number;
    unreadMessages: number;
  };
  pendingSlips: AdminDashboardSlip[];
  personalNote: string;
  recentEstimates: AdminEstimateSummary[];
  settings: AdminSiteSettings;
  todayJobs: AdminDashboardJob[];
  workload: {
    active: number;
    capacity: number;
    percent: number;
  };
};

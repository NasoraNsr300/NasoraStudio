export const adminEstimateStatuses = ["submitted", "reviewing", "quoted", "declined", "cancelled", "converted", "closed"] as const;

export type AdminEstimateStatus = (typeof adminEstimateStatuses)[number];

export type AdminEstimateSummary = {
  budgetMaxSatang: number | null;
  budgetMinSatang: number | null;
  customerDisplayName: string;
  id: string;
  requestCode: string;
  requesterType: "guest" | "member";
  serviceName: { en: string; th: string };
  status: AdminEstimateStatus;
  submittedAt: string;
};

export type AdminEstimateFilters = {
  status?: AdminEstimateStatus;
};

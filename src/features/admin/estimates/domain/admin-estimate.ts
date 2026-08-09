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

export type AdminEstimateAnswer = {
  fieldKey: string;
  label: { en: string; th: string };
  value: unknown;
};

export type AdminEstimateDetail = AdminEstimateSummary & {
  answers: AdminEstimateAnswer[];
  backgroundLevel: number;
  categoryName: { en: string; th: string };
  contact: { kind: string; value: string };
  description: string;
  extraCharacterCount: number;
  moodAndStyle: string | null;
  propCount: number;
  requestedDeadline: string | null;
  usageType: "commercial" | "personal";
};

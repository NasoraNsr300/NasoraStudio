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
  latestQuote: AdminEstimateQuoteSummary | null;
  moodAndStyle: string | null;
  propCount: number;
  requestedDeadline: string | null;
  usageType: "commercial" | "personal";
};

export type AdminEstimateQuoteSummary = {
  id: string;
  status: "accepted" | "closed" | "declined" | "draft" | "expired" | "sent" | "superseded";
  totalSatang: number;
  version: number;
};

export const adminQuoteItemTypes = ["base", "character", "background", "prop", "rush", "discount", "other"] as const;

export type AdminQuoteItemType = (typeof adminQuoteItemTypes)[number];

export type AdminQuoteLocalizedText = {
  en: string;
  th: string;
};

export type AdminQuoteDraftItem = {
  description: AdminQuoteLocalizedText;
  itemType: AdminQuoteItemType;
  label: AdminQuoteLocalizedText;
  lineTotalSatang: number;
  quantity: number;
  unitAmountSatang: number;
};

export type AdminQuoteDraftInput = {
  depositPercent: number;
  durationMaxDays: number;
  durationMinDays: number;
  expiresAt: string;
  freeRevisions: number;
  idempotencyKey: string;
  items: AdminQuoteDraftItem[];
  proposedDeadline: string | null;
  scope: AdminQuoteLocalizedText;
  termsDocument: { slug: string; version: number };
  totalSatang: number;
};

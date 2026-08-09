import type { AdminEstimateStatus } from "./admin-estimate";

export type AdminEstimateStatusTone = "danger" | "neutral" | "success" | "violet" | "warning";

export const adminEstimateStatusPresentation: Record<AdminEstimateStatus, { label: string; tone: AdminEstimateStatusTone }> = {
  cancelled: { label: "ยกเลิก", tone: "neutral" },
  closed: { label: "ปิดงาน", tone: "neutral" },
  converted: { label: "ยืนยันแล้ว", tone: "success" },
  declined: { label: "ปฏิเสธ", tone: "danger" },
  quoted: { label: "ส่งราคาแล้ว", tone: "violet" },
  reviewing: { label: "กำลังประเมิน", tone: "warning" },
  submitted: { label: "รอประเมิน", tone: "warning" },
};

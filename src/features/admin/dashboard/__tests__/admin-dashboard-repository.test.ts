import { describe, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({
  listEstimates: vi.fn(),
  listJobs: vi.fn(),
  listPendingSlips: vi.fn(),
  loadSettings: vi.fn(),
}));

import { getAdminDashboard } from "@/features/admin/dashboard/data/admin-dashboard-repository.server";

describe("Admin Dashboard repository", () => {
  it("aggregates bounded live rows and honest workload counts", async () => {
    dependencies.listEstimates.mockResolvedValue([
      { budgetMaxSatang: 450_000, budgetMinSatang: 300_000, customerDisplayName: "Luna", id: "request-1", requestCode: "REQ-1", requesterType: "member", serviceName: { en: "Full Body", th: "เต็มตัว" }, status: "submitted", submittedAt: "2026-08-12T02:00:00.000Z" },
    ]);
    dependencies.listJobs.mockResolvedValue([
      { customerDisplayName: "Luna", customerType: "member", deadline: "2026-08-20", depositVerifiedAt: "2026-08-12T01:00:00.000Z", id: "job-1", serviceName: { en: "Full Body", th: "เต็มตัว" }, statusKey: "sketching", statusLabel: { en: "Sketching", th: "กำลังร่าง" } },
      { customerDisplayName: "Guest", customerType: "guest", deadline: null, depositVerifiedAt: null, id: "job-2", serviceName: { en: "Chibi", th: "ชิบิ" }, statusKey: "completed", statusLabel: { en: "Completed", th: "เสร็จสิ้น" } },
    ]);
    dependencies.listPendingSlips.mockResolvedValue([{ amountSatang: 150_000, id: "slip-1", kind: "deposit", requestId: "request-1", uploadedAt: "2026-08-12T03:00:00.000Z" }]);
    dependencies.loadSettings.mockResolvedValue({ adminNote: "ตรวจงาน Luna", businessHours: "11:00 – 22:00", commissionsOpen: true, discordContact: "nasora", homeDescription: { en: "Story", th: "เรื่อง" }, homeHeading: { en: "Draw", th: "วาด" }, particlesEnabled: true, queueCapacity: 10, shootingStarsEnabled: true, updatedAt: "2026-08-12T00:00:00.000Z" });

    const result = await getAdminDashboard(dependencies);

    expect(result).toMatchObject({
      counts: { activeJobs: 1, pendingSlips: 1, submittedEstimates: 1, unreadMessages: 0 },
      personalNote: "ตรวจงาน Luna",
      workload: { active: 1, capacity: 10, percent: 10 },
    });
    expect(result.recentEstimates).toHaveLength(1);
    expect(result.activeJobs).toHaveLength(1);
  });
});

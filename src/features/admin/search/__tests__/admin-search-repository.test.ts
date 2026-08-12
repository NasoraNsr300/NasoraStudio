import { describe, expect, it, vi } from "vitest";
import { searchAdminRecords } from "@/features/admin/search/data/admin-search-repository.server";

describe("Admin global search", () => {
  it("returns grouped links without Guest contact snapshots", async () => {
    const result = await searchAdminRecords("luna", {
      listEstimates: vi.fn().mockResolvedValue([{ customerDisplayName: "Luna", id: "request-1", requestCode: "REQ-1", serviceName: { th: "เต็มตัว" } }]),
      listJobs: vi.fn().mockResolvedValue([{ customerDisplayName: "Luna", id: "job-1", serviceName: { th: "เต็มตัว" }, statusLabel: { th: "กำลังร่าง" } }]),
      listSlips: vi.fn().mockResolvedValue([{ id: "slip-1", requestId: "request-1" }]),
    });
    expect(result.map((item) => item.group)).toEqual(["แบบประเมิน", "งาน"]);
    expect(JSON.stringify(result)).not.toContain("contact");
  });
});

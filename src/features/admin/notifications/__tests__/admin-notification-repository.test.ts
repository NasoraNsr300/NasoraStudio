import { describe, expect, it, vi } from "vitest";
import { buildAdminNotificationFeed } from "@/features/admin/notifications/data/admin-notification-repository.server";

describe("Admin notification feed", () => {
  it("projects live estimates, slips, messages, and deadlines with read state", async () => {
    const feed = await buildAdminNotificationFeed({
      listConversations: vi.fn().mockResolvedValue([{ customerName: "Luna", id: "conversation-1", jobId: "job-1", lastMessageAt: "2026-08-12T06:00:00.000Z", messages: [], title: "Illustration", unreadCount: 2 }]),
      listEstimates: vi.fn().mockResolvedValue([{ customerDisplayName: "Luna", id: "request-1", status: "submitted", submittedAt: "2026-08-12T05:00:00.000Z" }]),
      listJobs: vi.fn().mockResolvedValue([{ customerDisplayName: "Luna", deadline: "2026-08-14", id: "job-1", statusKey: "sketching", statusLabel: { en: "Sketching", th: "กำลังร่าง" } }]),
      listPendingSlips: vi.fn().mockResolvedValue([{ id: "slip-1", requestId: "request-1", uploadedAt: "2026-08-12T04:00:00.000Z" }]),
      listReadKeys: vi.fn().mockResolvedValue(new Set(["estimate:request-1"])),
      now: new Date("2026-08-12T07:00:00.000Z"),
    });
    expect(feed.items.map((item) => item.kind)).toEqual(expect.arrayContaining(["estimate", "slip", "message", "deadline"]));
    expect(feed.items.find((item) => item.id === "estimate:request-1")?.read).toBe(true);
    expect(feed.unreadMessages).toBe(2);
  });
});

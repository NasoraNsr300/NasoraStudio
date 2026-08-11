import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AdminDashboard } from "@/features/admin/components/admin-dashboard";

afterEach(cleanup);

describe("AdminDashboard", () => {
  const dashboard = {
    activeJobs: [{ customerDisplayName: "Luna", customerType: "member" as const, deadline: "2026-08-20", depositVerifiedAt: "2026-08-12T01:00:00.000Z", id: "job-1", progressPercent: 30, serviceName: { en: "Full Body", th: "เต็มตัว" }, statusKey: "sketching", statusLabel: { en: "Sketching", th: "กำลังร่าง" } }],
    counts: { activeJobs: 1, pendingSlips: 0, submittedEstimates: 0, unreadMessages: 0 },
    pendingSlips: [],
    personalNote: "ตรวจคิว Luna",
    recentEstimates: [],
    settings: { adminNote: "ตรวจคิว Luna", businessHours: "11:00 – 22:00", commissionsOpen: true, discordContact: "nasora", homeDescription: { en: "Story", th: "เรื่อง" }, homeHeading: { en: "Draw", th: "วาด" }, particlesEnabled: true, queueCapacity: 10, shootingStarsEnabled: true, updatedAt: "2026-08-12T00:00:00.000Z" },
    todayJobs: [],
    workload: { active: 1, capacity: 10, percent: 10 },
  };

  it("renders the approved admin overview sections", () => {
    render(<AdminDashboard dashboard={dashboard} />);

    expect(screen.getByRole("heading", { name: "ภาพรวมวันนี้" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "แบบประเมินล่าสุด" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "ตรวจสอบสลิป" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "คิวงาน" })).toBeVisible();
    expect(screen.getByRole("link", { name: "เพิ่มคิว Guest" })).toHaveAttribute("href", "/admin/jobs?new=guest");
  });

  it("shows only live rows and honest workload summary", () => {
    render(<AdminDashboard dashboard={dashboard} />);

    const queue = screen.getByRole("table", { name: "คิวงานปัจจุบัน" });
    expect(within(queue).getByText("Luna")).toBeVisible();
    expect(screen.queryByText("Kirana")).not.toBeInTheDocument();
    expect(screen.getByText("10%")).toBeVisible();
  });
});

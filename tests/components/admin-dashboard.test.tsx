import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AdminDashboard } from "@/features/admin/components/admin-dashboard";

afterEach(cleanup);

describe("AdminDashboard", () => {
  it("renders the approved admin overview sections", () => {
    render(<AdminDashboard />);

    expect(screen.getByRole("heading", { name: "ภาพรวมวันนี้" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "แบบประเมินล่าสุด" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "ตรวจสอบสลิป" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "คิวงาน" })).toBeVisible();
    expect(screen.getByRole("button", { name: "เพิ่มคิว Guest" })).toBeVisible();
  });

  it("shows the current queue rows and workload summary", () => {
    render(<AdminDashboard />);

    const queue = screen.getByRole("table", { name: "คิวงานปัจจุบัน" });
    expect(within(queue).getByText("Kirana")).toBeVisible();
    expect(within(queue).getByText("ShiroNeko")).toBeVisible();
    expect(within(queue).getByText("Mildred")).toBeVisible();
    expect(screen.getByText("70%")).toBeVisible();
  });
});

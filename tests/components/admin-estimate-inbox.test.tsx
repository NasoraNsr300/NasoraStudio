import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  pathname: "/admin/estimates",
  push: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => navigation.searchParams,
}));

import { AdminEstimateInbox } from "@/features/admin/estimates/components/admin-estimate-inbox";
import type { AdminEstimateSummary } from "@/features/admin/estimates/domain/admin-estimate";

afterEach(() => {
  cleanup();
  navigation.pathname = "/admin/estimates";
  navigation.push.mockReset();
  navigation.searchParams = new URLSearchParams();
});

const requests: AdminEstimateSummary[] = [{
  budgetMaxSatang: 450000,
  budgetMinSatang: 300000,
  customerDisplayName: "Mali",
  id: "request-1",
  requestCode: "REQ-ABCDEF1234",
  requesterType: "member",
  serviceName: { en: "Full Body", th: "เต็มตัว" },
  status: "submitted",
  submittedAt: "2026-08-09T10:00:00.000Z",
}];

describe("AdminEstimateInbox", () => {
  it("renders supplied submitted requests in the approved inbox table", () => {
    render(<AdminEstimateInbox requests={requests} />);

    expect(screen.getByRole("table")).toBeVisible();
    expect(screen.getByText("Mali")).toBeVisible();
    expect(screen.getByText("REQ-ABCDEF1234")).toBeVisible();
    expect(screen.getByText("Full Body")).toBeVisible();
    expect(screen.getByText("฿3,000 – ฿4,500")).toBeVisible();
  });

  it("shows an empty state when there are no submitted requests", () => {
    render(<AdminEstimateInbox requests={[]} />);

    expect(screen.getByText("ยังไม่มีแบบประเมินในรายการนี้")).toBeVisible();
  });

  it("renders the corresponding status badge", () => {
    render(<AdminEstimateInbox requests={[{ ...requests[0], status: "quoted" }]} />);

    expect(screen.getByText(/ส่งราคาแล้ว/)).toHaveAttribute("data-tone", "violet");
  });

  it("opens the selected request on the current production route without an injected callback", async () => {
    const user = userEvent.setup();
    navigation.searchParams = new URLSearchParams("status=submitted");
    render(<AdminEstimateInbox requests={requests} />);

    await user.click(screen.getByRole("button", { name: "ประเมิน REQ-ABCDEF1234" }));

    expect(navigation.push).toHaveBeenCalledWith("/admin/estimates?status=submitted&request=request-1");
  });

  it("renders a meaningful read-only preview from a production deep-link selection", async () => {
    const user = userEvent.setup();
    navigation.searchParams = new URLSearchParams("request=request-1");
    render(<AdminEstimateInbox requests={requests} />);

    const preview = screen.getByRole("region", { name: "ตัวอย่างแบบประเมิน REQ-ABCDEF1234" });
    expect(within(preview).getByText("Mali")).toBeVisible();
    expect(within(preview).getByText("Full Body")).toBeVisible();
    expect(within(preview).getByText("฿3,000 – ฿4,500")).toBeVisible();
    expect(within(preview).getByText("9 ส.ค. 2569")).toBeVisible();
    expect(within(preview).getByText(/รอประเมิน/)).toBeVisible();

    await user.click(within(preview).getByRole("button", { name: "กลับไปรายการ" }));

    expect(navigation.push).toHaveBeenCalledWith("/admin/estimates");
  });
});

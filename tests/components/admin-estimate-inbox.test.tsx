import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminEstimateInbox } from "@/features/admin/estimates/components/admin-estimate-inbox";
import type { AdminEstimateSummary } from "@/features/admin/estimates/domain/admin-estimate";

afterEach(cleanup);

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

  it("opens the selected request from its row action", async () => {
    const onOpenRequest = vi.fn();
    const user = userEvent.setup();
    render(<AdminEstimateInbox onOpenRequest={onOpenRequest} requests={requests} />);

    await user.click(screen.getByRole("button", { name: "ประเมิน REQ-ABCDEF1234" }));

    expect(onOpenRequest).toHaveBeenCalledWith(requests[0]);
    expect(screen.getByRole("row", { name: /Mali.*REQ-ABCDEF1234/ })).toHaveAttribute("aria-selected", "true");
  });
});

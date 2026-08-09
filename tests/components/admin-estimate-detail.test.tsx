import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const controls = vi.hoisted(() => ({ render: vi.fn() }));
const quoteEditor = vi.hoisted(() => ({ render: vi.fn() }));

vi.mock("@/features/admin/estimates/components/admin-estimate-status-controls", () => ({
  AdminEstimateStatusControls: (props: { requestId: string; status: string }) => {
    controls.render(props);
    return <div data-testid="status-controls" />;
  },
}));

vi.mock("@/features/admin/estimates/components/admin-quote-editor", () => ({
  AdminQuoteEditor: (props: unknown) => {
    quoteEditor.render(props);
    return <div data-testid="quote-editor" />;
  },
}));

import { AdminEstimateDetail } from "@/features/admin/estimates/components/admin-estimate-detail";
import type { AdminEstimateDetail as AdminEstimateDetailModel } from "@/features/admin/estimates/domain/admin-estimate";

afterEach(() => {
  cleanup();
  controls.render.mockReset();
  quoteEditor.render.mockReset();
});

const request: AdminEstimateDetailModel = {
  answers: [{ fieldKey: "accepted_legal", label: { en: "Accepted policies", th: "ยอมรับนโยบาย" }, value: { accepted: true } }],
  backgroundLevel: 2,
  budgetMaxSatang: 450_000,
  budgetMinSatang: 300_000,
  categoryName: { en: "Illustration", th: "ภาพประกอบ" },
  contact: { kind: "discord", value: "@mali" },
  customerDisplayName: "Mali",
  description: "A moonlit character carrying a lantern.",
  extraCharacterCount: 1,
  id: "8c8b9d06-6619-471f-9b7f-ce1f619827f6",
  latestQuote: { id: "quote-v2", status: "sent", totalSatang: 300_000, version: 2 },
  moodAndStyle: "Soft watercolor",
  propCount: 2,
  requestCode: "REQ-ABCDEF1234",
  requestedDeadline: "2026-09-01",
  requesterType: "member",
  serviceName: { en: "Full Body", th: "เต็มตัว" },
  status: "submitted",
  submittedAt: "2026-08-09T10:00:00.000Z",
  usageType: "personal",
};

describe("AdminEstimateDetail", () => {
  it("shows the exact private admin submission details and requester identity", () => {
    render(<AdminEstimateDetail request={request} />);

    expect(screen.getByText("Mali")).toBeVisible();
    expect(screen.getByText(/Member · discord: @mali/)).toBeVisible();
    expect(screen.getByText(request.description)).toBeVisible();
    expect(screen.getByText("Soft watercolor")).toBeVisible();
    expect(screen.getByText("Personal")).toBeVisible();
    expect(screen.getByText("1")).toBeVisible();
    expect(screen.getAllByText("2")).toHaveLength(2);
    expect(screen.getByText("Accepted policies")).toBeVisible();
    expect(screen.getByText("Latest quote v2 · sent · ฿3,000")).toBeVisible();
    expect(controls.render).toHaveBeenCalledWith({ requestId: request.id, status: "submitted" });
    expect(quoteEditor.render).toHaveBeenCalledWith({
      requestId: request.id,
      requestedDeadline: request.requestedDeadline,
      serviceName: request.serviceName,
    });
    expect(JSON.stringify(quoteEditor.render.mock.calls)).not.toContain("@mali");
  });
});

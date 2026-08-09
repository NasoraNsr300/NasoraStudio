import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

import { AdminEstimateDetail } from "@/features/admin/estimates/components/admin-estimate-detail";
import type { AdminEstimateDetail as AdminEstimateDetailModel } from "@/features/admin/estimates/domain/admin-estimate";

afterEach(() => {
  cleanup();
  navigation.refresh.mockReset();
  vi.unstubAllGlobals();
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
  id: "request-1",
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
  });

  it("reviews a submitted request through the server-only status endpoint", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn(async () => new Response(JSON.stringify({ requestId: request.id, status: "reviewing" }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    render(<AdminEstimateDetail request={request} />);

    await user.click(screen.getByRole("button", { name: "Review request" }));

    expect(fetch).toHaveBeenCalledWith("/api/admin/estimates/request-1/status", expect.objectContaining({
      body: JSON.stringify({ status: "reviewing" }), method: "POST",
    }));
    expect(navigation.refresh).toHaveBeenCalledOnce();
  });

  it("does not submit a decline until a reason is supplied", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<AdminEstimateDetail request={request} />);

    await user.click(screen.getByRole("button", { name: "Decline request" }));
    await user.click(screen.getByRole("button", { name: "Confirm decline" }));

    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByText("A decline reason is required.")).toBeVisible();
  });
});

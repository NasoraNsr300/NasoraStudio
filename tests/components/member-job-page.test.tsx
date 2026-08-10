import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

vi.mock("@/features/member/components/member-sidebar", () => ({ MemberSidebar: () => <nav aria-label="Member" /> }));

import { MemberJobPage } from "@/features/member/components/member-job-page";

describe("member job page", () => {
  it("renders the signed-in member's real job snapshot and public history only", () => {
    render(<MemberJobPage locale="en" job={{ id: "job-1", code: "NSR-0001", title: "Chibi — Full Body", statusLabel: "Waiting", deadlineLabel: "1 Sep 2026", totalSatang: 140000, paidSatang: 70000, quoteId: "quote-1", requestId: "request-1", usageType: "personal", freeRevisions: 4, history: [{ id: "history-1", changedAtLabel: "10 Aug 2026", statusLabel: "Waiting", publicNote: "Deposit verified" }] }} />);
    expect(screen.getByRole("heading", { name: "Chibi — Full Body" })).toBeVisible();
    expect(screen.getByText("Job #NSR-0001")).toBeVisible();
    expect(screen.getByText("Deposit verified")).toBeVisible();
    expect(screen.queryByText(/admin note/i)).not.toBeInTheDocument();
  });

  it("shows persisted progress and an unlocked delivery without exposing its private object key", () => {
    render(<MemberJobPage locale="th" job={{ id: "job-1", code: "NSR-0001", title: "Illustration — Full Body", statusLabel: "ลงสี", deadlineLabel: "1 Sep 2026", totalSatang: 140000, paidSatang: 140000, quoteId: "quote-1", requestId: "request-1", usageType: "personal", freeRevisions: 4, history: [], progressUpdates: [{ body: "ส่งภาพลงสีรอบแรกให้ตรวจค่ะ", createdAt: "2026-08-10T10:00:00Z", id: "progress-1", title: "ลงสีรอบแรก" }], deliveries: [{ deliveredAt: "2026-08-10T11:00:00Z", displayName: "final-art.zip", expiresAt: "2026-09-09T11:00:00Z", id: "delivery-1", kind: "r2_file" }] }} />);
    expect(screen.getByText("ส่งภาพลงสีรอบแรกให้ตรวจค่ะ")).toBeVisible();
    expect(screen.getByRole("link", { name: /final-art\.zip/ })).toHaveAttribute("href", "/api/member/deliveries/delivery-1/download");
    expect(document.body.textContent).not.toContain("deliveries/job-1/private-key");
  });
});

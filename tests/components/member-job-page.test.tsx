import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
});

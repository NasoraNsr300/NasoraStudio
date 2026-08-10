import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MemberPaymentsContent } from "@/features/member/components/member-payments-page";

vi.mock("@/features/member/components/member-sidebar", () => ({ MemberSidebar: () => <nav /> }));
afterEach(cleanup);

describe("MemberPaymentsContent", () => {
  it("renders real balances and links outstanding jobs to their payment page", () => {
    render(<MemberPaymentsContent jobs={[{ code: "JOB1", deadlineLabel: "—", freeRevisions: 4, history: [], id: "job-1", paidSatang: 50000, quoteId: "quote-1", requestId: "request-1", statusLabel: "Working", title: "Illustration — Full Body", totalSatang: 100000, usageType: "personal" }]} locale="en" />);
    expect(screen.getByText("1,000 THB")).toBeVisible();
    expect(screen.getAllByText("500 THB")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Make payment" })).toHaveAttribute("href", "/en/member/requests/request-1");
    expect(screen.queryByText("#PAY-260520-001")).not.toBeInTheDocument();
  });
});

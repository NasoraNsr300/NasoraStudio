import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MemberQuote } from "@/features/member/data/member-quote-repository";
import { MemberQuotePanel } from "@/features/member/components/member-quote-panel";

const requestId = "8c8b9d06-6619-471f-9b7f-ce1f619827f6";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("MemberQuotePanel", () => {
  it("shows the authoritative THB breakdown and approximate USD for a 50% deposit", () => {
    render(<MemberQuotePanel locale="en" now="2026-08-20T00:00:00.000Z" quote={quote()} />);

    expect(screen.getAllByText("฿1,000")).toHaveLength(3);
    expect(screen.getAllByText("฿500")).toHaveLength(2);
    expect(screen.getByText(/Approx\. USD \$28\.57/)).toBeVisible();
    expect(screen.getByText(/50% deposit/)).toBeVisible();
    expect(screen.getByText(/Proposed deadline: Sep 20, 2026/)).toBeVisible();
  });

  it("calls the payment handoff without accepting the quote separately", async () => {
    const onPayDeposit = vi.fn();
    const user = userEvent.setup();
    render(<MemberQuotePanel locale="en" now="2026-08-20T00:00:00.000Z" onPayDeposit={onPayDeposit} quote={quote()} />);

    await user.click(screen.getByRole("button", { name: "Pay deposit" }));

    expect(onPayDeposit).toHaveBeenCalledWith({ depositSatang: 50_000, quoteId: "bf49a462-ef33-44d4-95d4-1a0de68472c5", requestId });
    expect(screen.queryByRole("button", { name: /accept/i })).not.toBeInTheDocument();
  });

  it("marks expired quotes as unavailable and does not offer payment", () => {
    render(<MemberQuotePanel locale="en" now="2026-09-02T00:00:00.000Z" quote={quote()} />);

    expect(screen.getByText("This quote has expired.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Pay deposit" })).not.toBeInTheDocument();
  });

  it("marks replaced quotes as unavailable and does not offer payment", () => {
    render(<MemberQuotePanel locale="en" now="2026-08-20T00:00:00.000Z" quote={quote({ status: "superseded" })} />);

    expect(screen.getByText("This quote has been replaced by a newer version.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Pay deposit" })).not.toBeInTheDocument();
  });

  it("lets an accepted quote pay a chosen installment while allowing a small final remainder", async () => {
    const onPayDeposit = vi.fn();
    const user = userEvent.setup();
    render(<MemberQuotePanel locale="en" onPayDeposit={onPayDeposit} quote={quote({ outstandingSatang: 8_500, paidSatang: 91_500, status: "accepted" })} />);

    const amount = screen.getByRole("spinbutton", { name: "Payment amount (THB)" });
    await user.clear(amount);
    await user.type(amount, "85");
    await user.click(screen.getByRole("button", { name: "Make payment" }));

    expect(onPayDeposit).toHaveBeenCalledWith({ depositSatang: 8_500, quoteId: "bf49a462-ef33-44d4-95d4-1a0de68472c5", requestId });
  });

  it("does not expire an accepted quote while its remaining balance is payable", () => {
    render(<MemberQuotePanel locale="en" now="2026-09-02T00:00:00.000Z" onPayDeposit={vi.fn()} quote={quote({ outstandingSatang: 50_000, paidSatang: 50_000, status: "accepted" })} />);
    expect(screen.getByRole("button", { name: "Make payment" })).toBeVisible();
    expect(screen.queryByText("This quote has expired.")).not.toBeInTheDocument();
  });
});

function quote(overrides: Partial<MemberQuote> = {}): MemberQuote {
  return {
    depositPercent: 50,
    depositSatang: 50_000,
    durationMaxDays: 14,
    durationMinDays: 7,
    expiresAt: "2026-09-01T12:00:00.000Z",
    freeRevisionCount: 4,
    id: "bf49a462-ef33-44d4-95d4-1a0de68472c5",
    items: [{ description: { en: "Flat colour", th: "ลงสีแบบเรียบ" }, id: "8204a3bf-a951-4a35-b8a0-0974f2b99327", itemType: "base", label: { en: "Full body", th: "เต็มตัว" }, lineTotalSatang: 100_000, quantity: 1, unitAmountSatang: 100_000 }],
    outstandingSatang: 50_000,
    paidSatang: 0,
    proposedDeadline: "2026-09-20",
    requestId,
    scope: { en: "One full-body illustration", th: "ภาพประกอบเต็มตัว 1 ภาพ" },
    status: "sent",
    termsDocument: { slug: "commission-terms", version: 1 },
    totalSatang: 100_000,
    version: 1,
    ...overrides,
  };
}

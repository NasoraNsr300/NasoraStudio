import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminPaymentReview, type PendingPaymentReview } from "@/features/payments/components/admin-payment-review";

afterEach(cleanup);

const payment: PendingPaymentReview = {
  amountSatang: 50_000,
  id: "a2eae2d8-f2ed-47bd-8335-43a79e33e4b7",
  kind: "deposit",
  previewUrl: "https://example.r2.cloudflarestorage.com/signed-preview",
  requestId: "8c8b9d06-6619-471f-9b7f-ce1f619827f6",
  uploadedAt: "2026-08-09T10:00:00.000Z",
};

describe("AdminPaymentReview", () => {
  it("preserves the payment dashboard and exposes temporary slip previews", () => {
    render(<AdminPaymentReview payments={[payment]} />);
    expect(screen.getByRole("heading", { name: /การชำระเงิน|payments/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /ดูสลิป|view slip/i })).toHaveAttribute("href", payment.previewUrl);
    expect(screen.getByText("฿500")).toBeVisible();
  });

  it("approves with a fresh idempotency key", async () => {
    const onVerify = vi.fn(async () => undefined);
    const user = userEvent.setup();
    render(<AdminPaymentReview onVerify={onVerify} payments={[payment]} />);
    await user.click(screen.getByRole("button", { name: /อนุมัติ|approve/i }));
    expect(onVerify).toHaveBeenCalledWith(expect.objectContaining({ decision: "approve", paymentId: payment.id, idempotencyKey: expect.any(String) }));
  });

  it("requires a reason before rejecting", async () => {
    const onVerify = vi.fn(async () => undefined);
    const user = userEvent.setup();
    render(<AdminPaymentReview onVerify={onVerify} payments={[payment]} />);
    await user.click(screen.getByRole("button", { name: /ปฏิเสธ|reject/i }));
    expect(screen.getByRole("textbox", { name: /เหตุผล|reason/i })).toBeVisible();
    await user.click(screen.getByRole("button", { name: /ยืนยันการปฏิเสธ|confirm rejection/i }));
    expect(screen.getByRole("alert")).toBeVisible();
    expect(onVerify).not.toHaveBeenCalled();
  });
});

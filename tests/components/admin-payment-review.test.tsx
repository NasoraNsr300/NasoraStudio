import { cleanup, render, screen, within } from "@testing-library/react";
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

  it("reuses the same decision key on retry and keeps errors local to the row", async () => {
    const second = { ...payment, id: "c605fb13-d781-4a67-8fa1-6ef597421880", requestId: "175adfe3-e5e6-4f93-b057-f610db6a5467" };
    const onVerify = vi.fn().mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<AdminPaymentReview onVerify={onVerify} payments={[payment, second]} />);
    const firstRow = screen.getByText(payment.requestId.slice(0, 8)).closest("tr")!;
    await user.click(within(firstRow).getByRole("button", { name: /อนุมัติ|approve/i }));
    expect(within(firstRow).getByRole("alert")).toBeVisible();
    const secondRow = screen.getByText(second.requestId.slice(0, 8)).closest("tr")!;
    expect(within(secondRow).queryByRole("alert")).toBeNull();
    await user.click(within(firstRow).getByRole("button", { name: /อนุมัติ|approve/i }));
    expect(onVerify.mock.calls[0][0].idempotencyKey).toBe(onVerify.mock.calls[1][0].idempotencyKey);
  });

  it("renews an expired preview through the supplied refresh action", async () => {
    const onRefresh = vi.fn();
    const user = userEvent.setup();
    render(<AdminPaymentReview onRefresh={onRefresh} payments={[payment]} />);
    await user.click(screen.getByRole("button", { name: /ต่ออายุลิงก์|renew/i }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("shows an object validation failure without dropping the row and exposes the next page", () => {
    render(<AdminPaymentReview nextPageHref="/admin/payments?beforeUploadedAt=next" payments={[{ ...payment, previewError: "ตรวจสอบไฟล์ไม่สำเร็จ", previewUrl: null }]} />);
    expect(screen.getByText("ตรวจสอบไฟล์ไม่สำเร็จ")).toBeVisible();
    expect(screen.getByText(payment.requestId.slice(0, 8))).toBeVisible();
    expect(screen.getByRole("link", { name: /หน้าถัดไป|next page/i })).toHaveAttribute("href", "/admin/payments?beforeUploadedAt=next");
  });
});

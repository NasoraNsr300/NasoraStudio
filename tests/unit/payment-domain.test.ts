import { describe, expect, it } from "vitest";

import { calculatePaymentAmount, createPromptPayPayload, detectSlipContentType, PaymentDomainError } from "@/features/payments/domain/payment";

describe("payment domain", () => {
  it("requires the first payment to equal the quote deposit exactly", () => {
    expect(calculatePaymentAmount({ depositSatang: 50_000, paidSatang: 0, requestedSatang: 50_000, totalSatang: 100_000 })).toEqual({ amountSatang: 50_000, kind: "deposit", remainingSatang: 50_000 });
    expect(() => calculatePaymentAmount({ depositSatang: 50_000, paidSatang: 0, requestedSatang: 49_999, totalSatang: 100_000 })).toThrowError(new PaymentDomainError("deposit_amount_mismatch"));
  });

  it("allows flexible installments of at least THB 100 after a verified deposit", () => {
    expect(calculatePaymentAmount({ depositSatang: 50_000, paidSatang: 50_000, requestedSatang: 10_000, totalSatang: 100_000 })).toEqual({ amountSatang: 10_000, kind: "installment", remainingSatang: 40_000 });
    expect(() => calculatePaymentAmount({ depositSatang: 50_000, paidSatang: 50_000, requestedSatang: 9_999, totalSatang: 100_000 })).toThrowError(new PaymentDomainError("payment_below_minimum"));
  });

  it("permits a final remainder below THB 100 but rejects overpayment", () => {
    expect(calculatePaymentAmount({ depositSatang: 50_000, paidSatang: 95_001, requestedSatang: 4_999, totalSatang: 100_000 })).toEqual({ amountSatang: 4_999, kind: "final", remainingSatang: 0 });
    expect(() => calculatePaymentAmount({ depositSatang: 50_000, paidSatang: 95_001, requestedSatang: 5_000, totalSatang: 100_000 })).toThrowError(new PaymentDomainError("payment_exceeds_balance"));
  });

  it.each([50_000.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects a non-integer satang value: %s", (requestedSatang) => {
    expect(() => calculatePaymentAmount({ depositSatang: 50_000, paidSatang: 0, requestedSatang, totalSatang: 100_000 })).toThrowError(new PaymentDomainError("invalid_satang"));
  });

  it("creates a PromptPay EMV payload with the exact configured amount and a valid CRC field", () => {
    const payload = createPromptPayPayload("0812345678", 50_025);
    expect(payload).toContain("5303764");
    expect(payload).toContain("5406500.25");
    expect(payload).toMatch(/6304[0-9A-F]{4}$/);
    expect(payload).not.toContain("0812345678");
  });

  it("matches a golden PromptPay amount payload and CRC used by established Thai banking implementations", () => {
    expect(createPromptPayPayload("000-000-0000", 422)).toBe("00020101021229370016A000000677010111011300660000000005802TH530376454044.226304E469");
  });

  it("accepts only a 15-digit e-wallet identifier", () => {
    expect(createPromptPayPayload("012345678901234", 422)).toContain("0315012345678901234");
    expect(() => createPromptPayPayload("ABC456789012345", 422)).toThrowError(new PaymentDomainError("invalid_promptpay_identifier"));
    expect(() => createPromptPayPayload("1234567890123456", 422)).toThrowError(new PaymentDomainError("invalid_promptpay_identifier"));
  });

  it("recognizes complete PNG, JPEG, and WebP files from magic bytes instead of trusting MIME", () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 2, 0xff, 0xd9]);
    const webp = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0x04, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(detectSlipContentType(png)).toBe("image/png");
    expect(detectSlipContentType(jpeg)).toBe("image/jpeg");
    expect(detectSlipContentType(webp)).toBe("image/webp");
  });

  it("rejects spoofed or truncated image bodies", () => {
    expect(() => detectSlipContentType(new TextEncoder().encode("not an image"))).toThrowError("invalid_slip_image");
    expect(() => detectSlipContentType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toThrowError("invalid_slip_image");
    expect(() => detectSlipContentType(Uint8Array.from([0xff, 0xd8, 0xff]))).toThrowError("invalid_slip_image");
  });
});

import { describe, expect, it } from "vitest";

import { calculatePaymentAmount, createPromptPayPayload, PaymentDomainError } from "@/features/payments/domain/payment";

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
});

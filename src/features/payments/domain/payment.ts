import { detectImageContentType } from "@/features/media/domain/image-upload";

const MIN_INSTALLMENT_SATANG = 10_000;

export type PaymentKind = "deposit" | "final" | "installment";

export class PaymentDomainError extends Error {
  constructor(readonly code: "deposit_amount_mismatch" | "invalid_payment_state" | "invalid_promptpay_identifier" | "invalid_satang" | "payment_below_minimum" | "payment_exceeds_balance") {
    super(code);
    this.name = "PaymentDomainError";
  }
}

type PaymentAmountInput = {
  depositSatang: number;
  paidSatang: number;
  requestedSatang: number;
  totalSatang: number;
};

function isSatang(value: number) {
  return Number.isSafeInteger(value) && value >= 0;
}

export function calculatePaymentAmount(input: PaymentAmountInput): { amountSatang: number; kind: PaymentKind; remainingSatang: number } {
  if (![input.depositSatang, input.paidSatang, input.requestedSatang, input.totalSatang].every(isSatang) || input.requestedSatang === 0) {
    throw new PaymentDomainError("invalid_satang");
  }
  if (input.depositSatang > input.totalSatang || input.paidSatang > input.totalSatang) {
    throw new PaymentDomainError("invalid_payment_state");
  }

  const balance = input.totalSatang - input.paidSatang;
  if (input.requestedSatang > balance) throw new PaymentDomainError("payment_exceeds_balance");

  if (input.paidSatang === 0) {
    if (input.requestedSatang !== input.depositSatang) throw new PaymentDomainError("deposit_amount_mismatch");
    return { amountSatang: input.requestedSatang, kind: "deposit", remainingSatang: balance - input.requestedSatang };
  }
  if (input.paidSatang < input.depositSatang) throw new PaymentDomainError("invalid_payment_state");
  if (input.requestedSatang === balance) {
    return { amountSatang: input.requestedSatang, kind: "final", remainingSatang: 0 };
  }
  if (input.requestedSatang < MIN_INSTALLMENT_SATANG) throw new PaymentDomainError("payment_below_minimum");
  return { amountSatang: input.requestedSatang, kind: "installment", remainingSatang: balance - input.requestedSatang };
}

function field(id: string, value: string) {
  return `${id}${value.length.toString().padStart(2, "0")}${value}`;
}

function promptPayTarget(identifier: string) {
  const normalized = identifier.replace(/[\s-]/g, "");
  if (/^0\d{9}$/.test(normalized)) return field("01", `0066${normalized.slice(1)}`);
  if (/^\d{13}$/.test(normalized)) return field("02", normalized);
  if (/^\d{15}$/.test(normalized)) return field("03", normalized);
  throw new PaymentDomainError("invalid_promptpay_identifier");
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (const character of payload) {
    crc ^= character.charCodeAt(0) << 8;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function createPromptPayPayload(identifier: string, amountSatang: number) {
  if (!isSatang(amountSatang) || amountSatang === 0) throw new PaymentDomainError("invalid_satang");
  const merchantAccount = field("00", "A000000677010111") + promptPayTarget(identifier);
  const withoutCrc = field("00", "01") + field("01", "12") + field("29", merchantAccount) + field("58", "TH") + field("53", "764") + field("54", (amountSatang / 100).toFixed(2)) + "6304";
  return `${withoutCrc}${crc16(withoutCrc)}`;
}

export type SlipContentType = (typeof PAYMENT_LIMITS.allowedSlipContentTypes)[number];

export function detectSlipContentType(bytes: Uint8Array): SlipContentType {
  try {
    return detectImageContentType(bytes);
  } catch {
    throw new Error("invalid_slip_image");
  }
}

export const PAYMENT_LIMITS = {
  allowedSlipContentTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  maxSlipBytes: 5 * 1024 * 1024,
  minInstallmentSatang: MIN_INSTALLMENT_SATANG,
};

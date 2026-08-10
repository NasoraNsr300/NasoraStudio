import { z } from "zod";

import { adminQuoteItemTypes, type AdminQuoteDraftInput } from "@/features/admin/estimates/domain/admin-estimate";
import { adminEstimateRequestIdSchema } from "@/features/admin/estimates/domain/admin-estimate-request-id";
import { createClient } from "@/shared/supabase/server";

const moneyMax = BigInt(2_147_483_647);
const moneyMin = -moneyMax;
const zero = BigInt(0);
const signedSatangPattern = /^-?(?:0|[1-9]\d*)$/;
const totalSatangPattern = /^(?:0|[1-9]\d*)$/;

function isSatangInRange(value: string, minimum: bigint, maximum: bigint, pattern: RegExp) {
  if (!pattern.test(value)) return false;
  const amount = BigInt(value);
  return amount >= minimum && amount <= maximum;
}

const signedSatangSchema = z.string().max(11).refine((value) => isSatangInRange(value, moneyMin, moneyMax, signedSatangPattern));
const totalSatangSchema = z.string().max(10).refine((value) => isSatangInRange(value, BigInt(1), moneyMax, totalSatangPattern));
const localizedTextSchema = z.object({
  en: z.string().trim().min(1).max(2_000),
  th: z.string().trim().min(1).max(2_000),
}).strict();
const quoteItemSchema = z.object({
  description: localizedTextSchema,
  itemType: z.enum(adminQuoteItemTypes),
  label: localizedTextSchema,
  lineTotalSatang: signedSatangSchema,
  quantity: z.number().int().positive().max(1_000),
  unitAmountSatang: signedSatangSchema,
}).strict().superRefine((item, context) => {
  if (!signedSatangPattern.test(item.unitAmountSatang) || !signedSatangPattern.test(item.lineTotalSatang)) return;
  if (BigInt(item.unitAmountSatang) * BigInt(item.quantity) !== BigInt(item.lineTotalSatang)) {
    context.addIssue({ code: "custom", message: "Line total is invalid", path: ["lineTotalSatang"] });
  }
});

const bodySchema = z.object({
  depositPercent: z.number().int().min(1).max(100),
  durationMaxDays: z.number().int().positive().max(3_650),
  durationMinDays: z.number().int().positive().max(3_650),
  expiresAt: z.iso.datetime({ offset: true }),
  freeRevisions: z.number().int().nonnegative().max(1_000),
  idempotencyKey: z.string().uuid(),
  items: z.array(quoteItemSchema).min(1).max(100),
  proposedDeadline: z.iso.date().nullable(),
  scope: localizedTextSchema,
  termsDocument: z.object({
    slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    version: z.number().int().positive(),
  }).strict(),
  totalSatang: totalSatangSchema,
}).strict().superRefine((quote, context) => {
  if (quote.durationMaxDays < quote.durationMinDays) {
    context.addIssue({ code: "custom", message: "Duration range is invalid", path: ["durationMaxDays"] });
  }
  if (!totalSatangPattern.test(quote.totalSatang)
    || quote.items.some((item) => !signedSatangPattern.test(item.lineTotalSatang) || !signedSatangPattern.test(item.unitAmountSatang))) {
    return;
  }
  const itemTotal = quote.items.reduce((total, item) => total + BigInt(item.lineTotalSatang), zero);
  if (itemTotal < zero || itemTotal > moneyMax || itemTotal !== BigInt(quote.totalSatang)) {
    context.addIssue({ code: "custom", message: "Quote total is invalid", path: ["totalSatang"] });
  }
});

type QuoteClient = {
  auth: { getUser(): Promise<{ data: { user: { app_metadata?: { role?: unknown } } | null }; error: unknown }> };
  rpc(name: string, input: Record<string, unknown>): Promise<{ data: unknown; error: { message?: string } | null }>;
};

function firstRow(data: unknown) {
  return Array.isArray(data) ? data[0] : data;
}

function safeHeaderValue(value: string | null) {
  return value && !value.includes(",") ? value.trim() : null;
}

function hasSameOrigin(request: Request) {
  const origin = safeHeaderValue(request.headers.get("origin"));
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId: rawRequestId } = await params;
  const requestId = adminEstimateRequestIdSchema.safeParse(rawRequestId);
  if (!requestId.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  if (!hasSameOrigin(request)) return Response.json({ error: "Invalid request origin" }, { status: 403 });
  if (request.headers.get("content-type")?.trim().toLowerCase() !== "application/json") {
    return Response.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const input = bodySchema.safeParse(payload);
  if (!input.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  const client = await createClient() as unknown as QuoteClient;
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) return Response.json({ error: "Authentication required" }, { status: 401 });
  if (authData.user.app_metadata?.role !== "admin") return Response.json({ error: "Admin access required" }, { status: 403 });

  const quote = input.data satisfies AdminQuoteDraftInput;
  const { data, error } = await client.rpc("admin_save_and_send_quote", {
    p_payload: quote,
    p_request_id: requestId.data,
  });
  if (error) {
    if (error.message === "admin_required") return Response.json({ error: "Admin access required" }, { status: 403 });
    if (error.message === "idempotency_payload_mismatch") {
      return Response.json({ error: "Submission key was already used for a different quote" }, { status: 409 });
    }
    if (error.message === "request_not_found" || error.message === "invalid_request_transition") {
      return Response.json({ error: "Request can no longer be quoted" }, { status: 409 });
    }
    return Response.json({ error: "Unable to send quote" }, { status: 400 });
  }

  const result = firstRow(data);
  const parsed = z.object({
    quote_id: z.string().uuid(),
    status: z.enum(["draft", "sent", "accepted", "declined", "expired", "closed", "superseded"]),
    version: z.number().int().positive(),
  }).safeParse(result);
  if (!parsed.success) return Response.json({ error: "Unable to send quote" }, { status: 400 });

  return Response.json({ quoteId: parsed.data.quote_id, status: parsed.data.status, version: parsed.data.version }, { status: 201 });
}

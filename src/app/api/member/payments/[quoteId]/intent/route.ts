import { z } from "zod";

import { createPaymentRepository, type PaymentClient } from "@/features/payments/data/payment-repository";
import { createPromptPayPayload } from "@/features/payments/domain/payment";
import { acceptsMutation, authenticatedUser } from "@/features/payments/http/payment-route-security";
import { createR2SlipStorage } from "@/features/payments/storage/r2-slip-storage.server";
import { createClient } from "@/shared/supabase/server";

const bodySchema = z.object({ depositSatang: z.number().int().positive(), idempotencyKey: z.uuid(), requestId: z.uuid() }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ quoteId: string }> }) {
  const quoteId = z.uuid().safeParse((await params).quoteId);
  if (!quoteId.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const rejected = acceptsMutation(request);
  if (rejected) return Response.json({ error: rejected.error }, { status: rejected.status });
  const promptPayId = process.env.PROMPTPAY_ID?.trim();
  if (!promptPayId) return Response.json({ error: "Payment service is not configured" }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  const input = bodySchema.safeParse(body);
  if (!input.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  let promptPayPayload: string;
  try {
    promptPayPayload = createPromptPayPayload(promptPayId, input.data.depositSatang);
    createR2SlipStorage();
  } catch {
    return Response.json({ error: "Payment service is not configured" }, { status: 503 });
  }
  const client = await createClient();
  if (!await authenticatedUser(client)) return Response.json({ error: "Authentication required" }, { status: 401 });
  try {
    const intent = await createPaymentRepository(client as unknown as PaymentClient).createIntent({ amountSatang: input.data.depositSatang, idempotencyKey: input.data.idempotencyKey, quoteId: quoteId.data, requestId: input.data.requestId });
    if (intent.status === "closed") throw new Error("quote_not_payable");
    if (intent.amountSatang !== input.data.depositSatang) throw new Error("idempotency_payload_mismatch");
    return Response.json({ amountSatang: intent.amountSatang, kind: intent.kind, paymentId: intent.id, promptPayPayload, status: intent.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const conflict = ["deposit_amount_mismatch", "quote_not_payable", "payment_exceeds_balance", "idempotency_payload_mismatch"].includes(message);
    return Response.json({ error: conflict ? "Payment intent is no longer available" : "Unable to create payment intent" }, { status: conflict ? 409 : 400 });
  }
}

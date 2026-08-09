import { z } from "zod";

import { createPaymentRepository, type PaymentClient } from "@/features/payments/data/payment-repository";
import { PAYMENT_LIMITS } from "@/features/payments/domain/payment";
import { acceptsMutation, authenticatedUser } from "@/features/payments/http/payment-route-security";
import { createR2SlipStorage } from "@/features/payments/storage/r2-slip-storage.server";
import { createClient } from "@/shared/supabase/server";

const authorizeSchema = z.object({ action: z.literal("authorize"), contentType: z.enum(PAYMENT_LIMITS.allowedSlipContentTypes), idempotencyKey: z.uuid(), sizeBytes: z.number().int().min(1).max(PAYMENT_LIMITS.maxSlipBytes) }).strict();
const confirmSchema = z.object({ action: z.literal("confirm"), slipId: z.uuid() }).strict();
const bodySchema = z.discriminatedUnion("action", [authorizeSchema, confirmSchema]);

export async function POST(request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  const paymentId = z.uuid().safeParse((await params).paymentId);
  if (!paymentId.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const rejected = acceptsMutation(request);
  if (rejected) return Response.json({ error: rejected.error }, { status: rejected.status });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  const input = bodySchema.safeParse(body);
  if (!input.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const client = await createClient();
  if (!await authenticatedUser(client)) return Response.json({ error: "Authentication required" }, { status: 401 });
  const repository = createPaymentRepository(client as unknown as PaymentClient);
  try {
    const storage = createR2SlipStorage();
    if (input.data.action === "authorize") {
      const objectKey = storage.createObjectKey(input.data.contentType);
      const slip = await repository.authorizeSlip({ contentType: input.data.contentType, idempotencyKey: input.data.idempotencyKey, objectKey, paymentId: paymentId.data, sizeBytes: input.data.sizeBytes });
      return Response.json({ contentType: input.data.contentType, deleteAfter: slip.deleteAfter, maxBytes: PAYMENT_LIMITS.maxSlipBytes, slipId: slip.id, uploadUrl: await storage.createUploadUrl(slip.objectKey, input.data.contentType) });
    }
    const slip = await repository.findOwnedSlip(paymentId.data, input.data.slipId);
    if (!slip) return Response.json({ error: "Payment slip not found" }, { status: 404 });
    const actual = await storage.headObject(slip.objectKey);
    if (actual.contentType !== slip.contentType || actual.sizeBytes !== slip.sizeBytes) return Response.json({ error: "Uploaded file metadata does not match" }, { status: 422 });
    return Response.json(await repository.confirmSlip(slip.id, actual.etag));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "r2_not_configured" ? 503 : message.includes("not_found") ? 404 : 400;
    return Response.json({ error: status === 503 ? "Slip storage is not configured" : "Unable to process payment slip" }, { status });
  }
}

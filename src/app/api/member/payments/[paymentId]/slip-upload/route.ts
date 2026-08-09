import { z } from "zod";

import { createPaymentGatewayClient } from "@/features/payments/data/payment-gateway-client.server";
import { createPaymentRepository, type PaymentClient } from "@/features/payments/data/payment-repository";
import { detectSlipContentType, PAYMENT_LIMITS } from "@/features/payments/domain/payment";
import { acceptsSameOrigin, authenticatedUser } from "@/features/payments/http/payment-route-security";
import { createR2SlipStorage } from "@/features/payments/storage/r2-slip-storage.server";
import { createClient } from "@/shared/supabase/server";

async function readBoundedBody(request: Request) {
  if (!request.body) throw new Error("invalid_slip_image");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > PAYMENT_LIMITS.maxSlipBytes) {
        await reader.cancel();
        throw new Error("slip_too_large");
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  if (size < 1) throw new Error("invalid_slip_image");
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

export async function POST(request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  const paymentId = z.uuid().safeParse((await params).paymentId);
  if (!paymentId.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const rejected = acceptsSameOrigin(request);
  if (rejected) return Response.json({ error: rejected.error }, { status: rejected.status });
  const declaredType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!(PAYMENT_LIMITS.allowedSlipContentTypes as readonly string[]).includes(declaredType)) return Response.json({ error: "Unsupported image type" }, { status: 415 });
  const uploadKey = z.uuid().safeParse(request.headers.get("idempotency-key"));
  if (!uploadKey.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const contentLength = request.headers.get("content-length");
  if (!contentLength) return Response.json({ error: "Content-Length is required" }, { status: 411 });
  if (!/^\d+$/.test(contentLength) || Number(contentLength) < 1 || Number(contentLength) > PAYMENT_LIMITS.maxSlipBytes) {
    return Response.json({ error: "Slip exceeds 5 MiB" }, { status: 413 });
  }
  const declaredSize = Number(contentLength);

  const client = await createClient();
  const user = await authenticatedUser(client);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

  let repository: ReturnType<typeof createPaymentRepository>;
  let storage: ReturnType<typeof createR2SlipStorage>;
  try {
    repository = createPaymentRepository(createPaymentGatewayClient() as unknown as PaymentClient);
    storage = createR2SlipStorage();
  }
  catch { return Response.json({ error: "Slip storage is not configured" }, { status: 503 }); }

  let allocated: Awaited<ReturnType<ReturnType<typeof createPaymentRepository>["allocateSlip"]>>;
  try {
    allocated = await repository.allocateSlip({ contentType: declaredType, idempotencyKey: uploadKey.data, paymentId: paymentId.data, sizeBytes: declaredSize, userId: user.id });
    if (allocated.status === "pending_review") return Response.json({ status: allocated.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "r2_not_configured" || message === "payment_gateway_not_configured" ? 503 : message.includes("rate_limited") ? 429 : message.includes("active") ? 409 : 400;
    return Response.json({ error: status === 503 ? "Slip storage is not configured" : status === 429 ? "Too many slip uploads" : "Unable to process payment slip" }, { status });
  }

  let bytes: Uint8Array;
  try {
    bytes = await readBoundedBody(request);
    if (bytes.byteLength !== declaredSize) throw new Error("slip_size_mismatch");
  } catch (error) {
    await repository.failSlip({ cleanupRequired: false, idempotencyKey: uploadKey.data, slipId: allocated.id, userId: user.id }).catch(() => undefined);
    const tooLarge = error instanceof Error && error.message === "slip_too_large";
    return Response.json({ error: tooLarge ? "Slip exceeds 5 MiB" : "Invalid slip image" }, { status: tooLarge ? 413 : 415 });
  }
  let detectedType: string;
  try { detectedType = detectSlipContentType(bytes); }
  catch {
    await repository.failSlip({ cleanupRequired: false, idempotencyKey: uploadKey.data, slipId: allocated.id, userId: user.id }).catch(() => undefined);
    return Response.json({ error: "Invalid slip image" }, { status: 415 });
  }
  if (detectedType !== declaredType) {
    await repository.failSlip({ cleanupRequired: false, idempotencyKey: uploadKey.data, slipId: allocated.id, userId: user.id }).catch(() => undefined);
    return Response.json({ error: "Image bytes do not match Content-Type" }, { status: 415 });
  }

  try {
    const uploaded = await storage.putObject(allocated.objectKey, bytes, detectedType);
    const finalized = await repository.finalizeSlip({ contentType: detectedType, etag: uploaded.etag, idempotencyKey: uploadKey.data, sizeBytes: bytes.byteLength, slipId: allocated.id, userId: user.id });
    return Response.json({ status: finalized.status });
  } catch {
    let cleanupRequired = false;
    try { await storage.deleteObject(allocated.objectKey); } catch { cleanupRequired = true; }
    await repository.failSlip({ cleanupRequired, idempotencyKey: uploadKey.data, slipId: allocated.id, userId: user.id }).catch(() => undefined);
    return Response.json({ error: "Unable to process payment slip" }, { status: 400 });
  }
}

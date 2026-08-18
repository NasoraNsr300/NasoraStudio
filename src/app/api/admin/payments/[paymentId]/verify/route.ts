import { z } from "zod";

import { createAdminPaymentRepository, type AdminPaymentClient } from "@/features/payments/data/admin-payment-repository.server";
import { createServiceRoleClient } from "@/shared/supabase/service-role-client.server";
import { acceptsMutation, authenticatedUser } from "@/features/payments/http/payment-route-security";
import { createR2SlipStorage, normalizeEtag } from "@/features/payments/storage/r2-slip-storage.server";
import { createClient } from "@/shared/supabase/server";

const bodySchema = z.object({ decision: z.enum(["approve", "reject"]), idempotencyKey: z.uuid(), reason: z.string().trim().min(1).max(1000).optional() }).strict().superRefine((value, context) => {
  if (value.decision === "reject" && !value.reason) context.addIssue({ code: "custom", message: "Reason required", path: ["reason"] });
});

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
  const user = await authenticatedUser(client);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  if (user.app_metadata?.role !== "admin" || user.email?.toLowerCase() !== "nasora.nsr300@gmail.com") return Response.json({ error: "Admin access required" }, { status: 403 });
  const memberScopedRepository = createAdminPaymentRepository(client as unknown as AdminPaymentClient);
  let gatewayRepository: ReturnType<typeof createAdminPaymentRepository>;
  let gatewayClient: ReturnType<typeof createServiceRoleClient>;
  try {
    gatewayClient = createServiceRoleClient();
    gatewayRepository = createAdminPaymentRepository(gatewayClient as unknown as AdminPaymentClient);
  }
  catch { return Response.json({ error: "Payment service is not configured" }, { status: 503 }); }
  try {
    const decision = input.data.decision;
    const reason = input.data.reason ?? null;
    const replay = await gatewayRepository.findVerificationResult({ adminUserId: user.id, decision, idempotencyKey: input.data.idempotencyKey, paymentId: paymentId.data, reason });
    if (replay) {
      if (replay.slipStatus === "approved" && replay.paymentId) {
        const workflow = await gatewayClient.rpc("gateway_create_job_from_verified_deposit", { p_admin_user_id: user.id, p_payment_id: replay.paymentId });
        if (workflow.error) throw new Error("job_creation_failed");
      }
      return Response.json(replay);
    }
    const slip = await memberScopedRepository.findReviewSlip(paymentId.data);
    if (!slip) {
      const concurrentReplay = await gatewayRepository.findVerificationResult({ adminUserId: user.id, decision, idempotencyKey: input.data.idempotencyKey, paymentId: paymentId.data, reason });
      if (concurrentReplay?.slipStatus === "approved" && concurrentReplay.paymentId) {
        const workflow = await gatewayClient.rpc("gateway_create_job_from_verified_deposit", { p_admin_user_id: user.id, p_payment_id: concurrentReplay.paymentId });
        if (workflow.error) throw new Error("job_creation_failed");
      }
      return concurrentReplay ? Response.json(concurrentReplay) : Response.json({ error: "Payment slip not found" }, { status: 404 });
    }
    if (decision === "approve") {
      const actual = await createR2SlipStorage().headObject(slip.objectKey);
      if (actual.contentType !== slip.contentType || actual.sizeBytes !== slip.sizeBytes || normalizeEtag(actual.etag) !== normalizeEtag(slip.etag)) return Response.json({ error: "Uploaded file metadata does not match" }, { status: 422 });
    }
    const result = await gatewayRepository.verify({ adminUserId: user.id, decision, idempotencyKey: input.data.idempotencyKey, paymentId: paymentId.data, reason });
    if (decision === "reject") {
      try { await createR2SlipStorage().deleteObject(slip.objectKey); } catch { /* Lifecycle expiry remains the fallback. */ }
    }
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const conflict = message.includes("not_reviewable") || message.includes("idempotency");
    const metadata = message.includes("r2_object_not_found") || message.includes("invalid_r2_object_metadata");
    return Response.json({ error: conflict ? "Payment slip is no longer reviewable" : metadata ? "Uploaded file metadata does not match" : "Unable to verify payment slip" }, { status: conflict ? 409 : metadata ? 422 : 400 });
  }
}

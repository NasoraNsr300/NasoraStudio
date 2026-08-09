import { z } from "zod";

import { createAdminPaymentRepository, type AdminPaymentClient } from "@/features/payments/data/admin-payment-repository.server";
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
  const repository = createAdminPaymentRepository(client as unknown as AdminPaymentClient);
  try {
    const slip = await repository.findReviewSlip(paymentId.data);
    if (!slip) return Response.json({ error: "Payment slip not found" }, { status: 404 });
    const actual = await createR2SlipStorage().headObject(slip.objectKey);
    if (actual.contentType !== slip.contentType || actual.sizeBytes !== slip.sizeBytes || normalizeEtag(actual.etag) !== normalizeEtag(slip.etag)) return Response.json({ error: "Uploaded file metadata does not match" }, { status: 422 });
    return Response.json(await repository.verify({ decision: input.data.decision, idempotencyKey: input.data.idempotencyKey, paymentId: paymentId.data, reason: input.data.reason ?? null }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const conflict = message.includes("not_reviewable") || message.includes("idempotency");
    return Response.json({ error: conflict ? "Payment slip is no longer reviewable" : "Unable to verify payment slip" }, { status: conflict ? 409 : 400 });
  }
}

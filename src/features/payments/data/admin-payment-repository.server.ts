import "server-only";
import { z } from "zod";

export type AdminPaymentClient = {
  rpc(name: string, input: Record<string, unknown>): Promise<{ data: unknown; error: { message?: string } | null }>;
};

const reviewSlipSchema = z.object({ content_type: z.enum(["image/png", "image/jpeg", "image/webp"]), etag: z.string().trim().min(1), object_key: z.string().startsWith("payment-slips/"), size_bytes: z.coerce.number().int().positive(), slip_id: z.uuid() });
const verificationSchema = z.object({ intent_id: z.uuid(), payment_id: z.uuid().nullable(), slip_status: z.enum(["approved", "rejected", "stale"]) });
const pendingSchema = z.object({
  amount_satang: z.coerce.number().int(),
  content_type: z.enum(["image/png", "image/jpeg", "image/webp"]),
  etag: z.string().trim().min(1),
  kind: z.enum(["deposit", "installment", "final"]),
  object_key: z.string(),
  request_id: z.uuid(),
  size_bytes: z.coerce.number().int(),
  slip_id: z.uuid(),
  uploaded_at: z.string(),
});

function first(data: unknown) { return Array.isArray(data) ? data[0] : data; }

export function createAdminPaymentRepository(client: AdminPaymentClient) {
  return {
    async findReviewSlip(id: string) {
      const result = await client.rpc("admin_get_payment_slip_for_review", { p_slip_id: id });
      if (result.error) throw new Error(result.error.message || "payment_repository_error");
      if (!result.data) return null;
      const row = reviewSlipSchema.parse(first(result.data));
      return { contentType: row.content_type, etag: row.etag, id: row.slip_id, objectKey: row.object_key, sizeBytes: row.size_bytes };
    },
    async listPending(input: { before?: { id: string; uploadedAt: string }; limit?: number } = {}) {
      const result = await client.rpc("admin_list_pending_payment_slips", { p_before_id: input.before?.id ?? null, p_before_uploaded_at: input.before?.uploadedAt ?? null, p_limit: input.limit ?? 25 });
      if (result.error) throw new Error(result.error.message || "payment_repository_error");
      return z.array(pendingSchema).parse(result.data ?? []).map((row) => ({ amountSatang: row.amount_satang, contentType: row.content_type, etag: row.etag, id: row.slip_id, kind: row.kind, objectKey: row.object_key, requestId: row.request_id, sizeBytes: row.size_bytes, uploadedAt: row.uploaded_at }));
    },
    async verify(input: { decision: "approve" | "reject"; idempotencyKey: string; paymentId: string; reason: string | null }) {
      const result = await client.rpc("admin_verify_payment_slip", { p_decision: input.decision, p_payment_id: input.paymentId, p_reason: input.reason, p_verification_key: input.idempotencyKey });
      if (result.error) throw new Error(result.error.message || "payment_repository_error");
      const row = verificationSchema.parse(first(result.data));
      return { intentId: row.intent_id, paymentId: row.payment_id, slipStatus: row.slip_status };
    },
  };
}

import "server-only";
import { z } from "zod";

type AdminQuery = PromiseLike<{ data: unknown; error: { message?: string } | null }> & {
  eq(column: string, value: string): AdminQuery;
  maybeSingle(): Promise<{ data: unknown; error: { message?: string } | null }>;
  order(column: string, options?: { ascending?: boolean }): AdminQuery;
  select(columns: string): AdminQuery;
};
export type AdminPaymentClient = {
  from(table: "payment_slips"): AdminQuery;
  rpc(name: string, input: Record<string, unknown>): Promise<{ data: unknown; error: { message?: string } | null }>;
};

const reviewSlipSchema = z.object({ content_type: z.enum(["image/png", "image/jpeg", "image/webp"]), id: z.uuid(), object_key: z.string().startsWith("payment-slips/"), size_bytes: z.coerce.number().int().positive() });
const verificationSchema = z.object({ intent_id: z.uuid(), payment_id: z.uuid().nullable(), slip_status: z.enum(["approved", "rejected"]) });
const pendingSchema = z.object({
  content_type: z.enum(["image/png", "image/jpeg", "image/webp"]),
  id: z.uuid(),
  object_key: z.string(),
  payment_intents: z.object({ amount_satang: z.coerce.number().int(), kind: z.enum(["deposit", "installment", "final"]), request_id: z.uuid() }),
  size_bytes: z.coerce.number().int(),
  uploaded_at: z.string(),
});

function first(data: unknown) { return Array.isArray(data) ? data[0] : data; }

export function createAdminPaymentRepository(client: AdminPaymentClient) {
  return {
    async findReviewSlip(id: string) {
      const result = await client.from("payment_slips").select("id,object_key,content_type,size_bytes").eq("id", id).eq("status", "pending_review").maybeSingle();
      if (result.error) throw new Error(result.error.message || "payment_repository_error");
      if (!result.data) return null;
      const row = reviewSlipSchema.parse(first(result.data));
      return { contentType: row.content_type, id: row.id, objectKey: row.object_key, sizeBytes: row.size_bytes };
    },
    async listPending() {
      const result = await client.from("payment_slips").select("id,object_key,content_type,size_bytes,uploaded_at,payment_intents!inner(amount_satang,kind,request_id)").eq("status", "pending_review").order("uploaded_at", { ascending: true });
      if (result.error) throw new Error(result.error.message || "payment_repository_error");
      return z.array(pendingSchema).parse(result.data ?? []).map((row) => ({ amountSatang: row.payment_intents.amount_satang, contentType: row.content_type, id: row.id, kind: row.payment_intents.kind, objectKey: row.object_key, requestId: row.payment_intents.request_id, sizeBytes: row.size_bytes, uploadedAt: row.uploaded_at }));
    },
    async verify(input: { decision: "approve" | "reject"; idempotencyKey: string; paymentId: string; reason: string | null }) {
      const result = await client.rpc("admin_verify_payment_slip", { p_decision: input.decision, p_payment_id: input.paymentId, p_reason: input.reason, p_verification_key: input.idempotencyKey });
      if (result.error) throw new Error(result.error.message || "payment_repository_error");
      const row = verificationSchema.parse(first(result.data));
      return { intentId: row.intent_id, paymentId: row.payment_id, slipStatus: row.slip_status };
    },
  };
}

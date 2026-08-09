import { z } from "zod";

type RpcResult = { data: unknown; error: { message?: string } | null };

export type PaymentClient = {
  rpc(name: string, input: Record<string, unknown>): Promise<RpcResult>;
};

const intentSchema = z.object({ amount_satang: z.coerce.number().int().positive(), intent_id: z.uuid(), kind: z.enum(["deposit", "installment", "final"]), status: z.enum(["pending", "verified", "closed"]) });
const authorizationSchema = z.object({ object_key: z.string().startsWith("payment-slips/"), slip_id: z.uuid(), slip_status: z.enum(["authorized", "pending_review", "failed"]) });
const finalizationSchema = z.object({ slip_id: z.uuid(), slip_status: z.literal("pending_review") });

function first(data: unknown) { return Array.isArray(data) ? data[0] : data; }
function requireResult<T>(result: RpcResult, schema: z.ZodType<T>): T {
  if (result.error) throw new Error(result.error.message || "payment_repository_error");
  const parsed = schema.safeParse(first(result.data));
  if (!parsed.success) throw new Error("invalid_payment_response");
  return parsed.data;
}

export function createPaymentRepository(client: PaymentClient) {
  return {
    async createIntent(input: { amountSatang: number; idempotencyKey: string; quoteId: string; requestId: string }) {
      const result = await client.rpc("member_create_payment_intent", { p_amount_satang: input.amountSatang, p_idempotency_key: input.idempotencyKey, p_quote_id: input.quoteId, p_request_id: input.requestId });
      if (!result.error && first(result.data) == null) throw new Error("quote_not_payable");
      const row = requireResult(result, intentSchema);
      return { amountSatang: row.amount_satang, id: row.intent_id, kind: row.kind, status: row.status };
    },
    async allocateSlip(input: { contentType: string; idempotencyKey: string; paymentId: string; sizeBytes: number; userId: string }) {
      const result = await client.rpc("gateway_authorize_payment_slip", { p_content_type: input.contentType, p_intent_id: input.paymentId, p_size_bytes: input.sizeBytes, p_upload_key: input.idempotencyKey, p_user_id: input.userId });
      const row = requireResult(result, authorizationSchema);
      return { id: row.slip_id, objectKey: row.object_key, status: row.slip_status };
    },
    async finalizeSlip(input: { contentType: string; etag: string; idempotencyKey: string; sizeBytes: number; slipId: string; userId: string }) {
      const row = requireResult(await client.rpc("gateway_finalize_payment_slip", { p_content_type: input.contentType, p_etag: input.etag, p_size_bytes: input.sizeBytes, p_slip_id: input.slipId, p_upload_key: input.idempotencyKey, p_user_id: input.userId }), finalizationSchema);
      return { id: row.slip_id, status: row.slip_status };
    },
    async failSlip(input: { cleanupRequired: boolean; idempotencyKey: string; slipId: string; userId: string }) {
      const result = await client.rpc("gateway_fail_payment_slip", { p_cleanup_required: input.cleanupRequired, p_slip_id: input.slipId, p_upload_key: input.idempotencyKey, p_user_id: input.userId });
      if (result.error) throw new Error(result.error.message || "payment_repository_error");
    },
  };
}

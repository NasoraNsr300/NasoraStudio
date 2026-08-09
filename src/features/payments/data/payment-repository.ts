import { z } from "zod";

type RpcResult = { data: unknown; error: { message?: string } | null };
type QueryResult = { data: unknown; error: { message?: string } | null };
type PaymentQuery = PromiseLike<QueryResult> & {
  eq(column: string, value: string): PaymentQuery;
  maybeSingle(): Promise<QueryResult>;
  select(columns: string): PaymentQuery;
};

export type PaymentClient = {
  from(table: "payment_slips"): PaymentQuery;
  rpc(name: string, input: Record<string, unknown>): Promise<RpcResult>;
};

const intentSchema = z.object({ amount_satang: z.coerce.number().int().positive(), intent_id: z.uuid(), kind: z.enum(["deposit", "installment", "final"]), status: z.enum(["pending", "verified", "closed"]) });
const authorizationSchema = z.object({ delete_after: z.string(), object_key: z.string().startsWith("payment-slips/"), slip_id: z.uuid() });
const slipSchema = z.object({ content_type: z.enum(["image/png", "image/jpeg", "image/webp"]), id: z.uuid(), object_key: z.string().startsWith("payment-slips/"), size_bytes: z.coerce.number().int().positive() });
const confirmationSchema = z.object({ slip_id: z.uuid(), status: z.literal("pending_review") });

function first(data: unknown) { return Array.isArray(data) ? data[0] : data; }
function requireResult<T>(result: RpcResult | QueryResult, schema: z.ZodType<T>): T {
  if (result.error) throw new Error(result.error.message || "payment_repository_error");
  const parsed = schema.safeParse(first(result.data));
  if (!parsed.success) throw new Error("invalid_payment_response");
  return parsed.data;
}

export function createPaymentRepository(client: PaymentClient) {
  return {
    async createIntent(input: { amountSatang: number; idempotencyKey: string; quoteId: string; requestId: string }) {
      const result = await client.rpc("member_create_payment_intent", { p_amount_satang: input.amountSatang, p_idempotency_key: input.idempotencyKey, p_quote_id: input.quoteId, p_request_id: input.requestId });
      const row = requireResult(result, intentSchema);
      return { amountSatang: row.amount_satang, id: row.intent_id, kind: row.kind, status: row.status };
    },
    async authorizeSlip(input: { contentType: string; idempotencyKey: string; objectKey: string; paymentId: string; sizeBytes: number }) {
      const result = await client.rpc("member_authorize_payment_slip", { p_content_type: input.contentType, p_intent_id: input.paymentId, p_object_key: input.objectKey, p_size_bytes: input.sizeBytes, p_upload_key: input.idempotencyKey });
      const row = requireResult(result, authorizationSchema);
      return { deleteAfter: row.delete_after, id: row.slip_id, objectKey: row.object_key };
    },
    async findOwnedSlip(paymentId: string, slipId: string) {
      const result = await client.from("payment_slips").select("id,intent_id,object_key,content_type,size_bytes").eq("id", slipId).eq("intent_id", paymentId).maybeSingle();
      if (!result.data && !result.error) return null;
      const row = requireResult(result, slipSchema);
      return { contentType: row.content_type, id: row.id, objectKey: row.object_key, sizeBytes: row.size_bytes };
    },
    async confirmSlip(slipId: string, etag: string) {
      const row = requireResult(await client.rpc("member_confirm_payment_slip", { p_etag: etag, p_slip_id: slipId }), confirmationSchema);
      return { id: row.slip_id, status: row.status };
    },
  };
}

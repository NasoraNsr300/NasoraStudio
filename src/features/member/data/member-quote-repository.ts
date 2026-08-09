import { z } from "zod";

export type MemberQuoteStatus = "accepted" | "closed" | "declined" | "draft" | "expired" | "sent" | "superseded";

export type MemberQuote = {
  depositPercent: number;
  depositSatang: number;
  durationMaxDays: number | null;
  durationMinDays: number | null;
  expiresAt: string | null;
  freeRevisionCount: number;
  id: string;
  items: MemberQuoteItem[];
  outstandingSatang: number;
  proposedDeadline: string | null;
  requestId: string;
  scope: MemberQuoteLocalizedText;
  status: MemberQuoteStatus;
  termsDocument: { slug: string; version: number };
  totalSatang: number;
  version: number;
};

export type MemberQuoteItem = {
  description: MemberQuoteLocalizedText;
  id: string;
  itemType: "background" | "base" | "character" | "discount" | "other" | "prop" | "rush";
  label: MemberQuoteLocalizedText;
  lineTotalSatang: number;
  quantity: number;
  unitAmountSatang: number;
};

export type MemberQuoteLocalizedText = { en: string; th: string };

export type MemberQuoteResult<T = undefined> =
  | { data: T; ok: true }
  | { message: string; ok: false };

type QueryError = { message?: string } | null;
type QueryResult = { data: unknown; error: QueryError };

export type MemberQuoteQuery = PromiseLike<QueryResult> & {
  eq(column: string, value: string): MemberQuoteQuery;
  limit(count: number): MemberQuoteQuery;
  maybeSingle(): Promise<QueryResult>;
  order(column: string, options?: { ascending?: boolean }): MemberQuoteQuery;
  select(columns?: string): MemberQuoteQuery;
};

export type MemberQuoteClient = {
  from(table: "commission_requests" | "quote_items" | "quotes"): MemberQuoteQuery;
};

const localizedTextSchema = z.object({ en: z.string(), th: z.string() });
const quoteRowSchema = z.object({
  deposit_percent: z.number().int().min(0).max(100),
  deposit_satang: z.number().int().nonnegative(),
  estimated_duration_max_days: z.number().int().positive().nullable(),
  estimated_duration_min_days: z.number().int().positive().nullable(),
  expires_at: z.string().nullable(),
  free_revision_count: z.number().int().nonnegative(),
  id: z.uuid(),
  proposed_deadline: z.string().nullable(),
  request_id: z.uuid(),
  scope_summary: localizedTextSchema,
  status: z.enum(["draft", "sent", "accepted", "declined", "expired", "closed", "superseded"]),
  terms_document_slug: z.string().min(1),
  terms_document_version: z.number().int().positive(),
  total_satang: z.number().int().nonnegative(),
  version: z.number().int().positive(),
}).superRefine((quote, context) => {
  if (quote.deposit_satang > quote.total_satang) {
    context.addIssue({ code: "custom", message: "Invalid deposit amount", path: ["deposit_satang"] });
  }
});

const quoteItemRowSchema = z.object({
  description_snapshot: localizedTextSchema,
  display_order: z.number().int().nonnegative(),
  id: z.uuid(),
  item_type: z.enum(["base", "character", "background", "prop", "rush", "discount", "other"]),
  label_snapshot: localizedTextSchema,
  line_total_satang: z.number().int(),
  quantity: z.number().int().positive(),
  unit_amount_satang: z.number().int(),
});

function failure(error?: QueryError | unknown): MemberQuoteResult<never> {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string" && error.message.trim()) {
    return { message: "Unable to load this quote", ok: false };
  }
  return { message: "Unable to load this quote", ok: false };
}

export function createMemberQuoteRepository(client: MemberQuoteClient) {
  return {
    async load(requestId: string): Promise<MemberQuoteResult<MemberQuote | null>> {
      const parsedRequestId = z.uuid().safeParse(requestId);
      if (!parsedRequestId.success) return failure();

      // RLS permits this row only to its owning authenticated member; guests have no member-owned row to expose.
      const ownership = await client.from("commission_requests").select("id").eq("id", parsedRequestId.data).maybeSingle();
      if (ownership.error) return failure(ownership.error);
      if (!ownership.data) return { data: null, ok: true };

      const latestQuote = await client.from("quotes")
        .select("id,request_id,version,status,scope_summary,total_satang,deposit_percent,deposit_satang,free_revision_count,estimated_duration_min_days,estimated_duration_max_days,proposed_deadline,terms_document_slug,terms_document_version,expires_at")
        .eq("request_id", parsedRequestId.data)
        .eq("status", "sent")
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestQuote.error) return failure(latestQuote.error);
      if (!latestQuote.data) return { data: null, ok: true };

      const parsedQuote = quoteRowSchema.safeParse(latestQuote.data);
      if (!parsedQuote.success || parsedQuote.data.request_id !== parsedRequestId.data) return failure(parsedQuote.error);

      const itemResult = await client.from("quote_items")
        .select("id,item_type,label_snapshot,description_snapshot,quantity,unit_amount_satang,line_total_satang,display_order")
        .eq("quote_id", parsedQuote.data.id)
        .order("display_order", { ascending: true });
      if (itemResult.error) return failure(itemResult.error);
      const parsedItems = z.array(quoteItemRowSchema).safeParse(Array.isArray(itemResult.data) ? itemResult.data : []);
      if (!parsedItems.success) return failure(parsedItems.error);

      return {
        data: {
          depositPercent: parsedQuote.data.deposit_percent,
          depositSatang: parsedQuote.data.deposit_satang,
          durationMaxDays: parsedQuote.data.estimated_duration_max_days,
          durationMinDays: parsedQuote.data.estimated_duration_min_days,
          expiresAt: parsedQuote.data.expires_at,
          freeRevisionCount: parsedQuote.data.free_revision_count,
          id: parsedQuote.data.id,
          items: parsedItems.data.map((item) => ({
            description: item.description_snapshot,
            id: item.id,
            itemType: item.item_type,
            label: item.label_snapshot,
            lineTotalSatang: item.line_total_satang,
            quantity: item.quantity,
            unitAmountSatang: item.unit_amount_satang,
          })),
          outstandingSatang: parsedQuote.data.total_satang - parsedQuote.data.deposit_satang,
          proposedDeadline: parsedQuote.data.proposed_deadline,
          requestId: parsedQuote.data.request_id,
          scope: parsedQuote.data.scope_summary,
          status: parsedQuote.data.status,
          termsDocument: { slug: parsedQuote.data.terms_document_slug, version: parsedQuote.data.terms_document_version },
          totalSatang: parsedQuote.data.total_satang,
          version: parsedQuote.data.version,
        },
        ok: true,
      };
    },
  };
}

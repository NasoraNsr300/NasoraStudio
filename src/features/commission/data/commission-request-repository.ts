import { z } from "zod";

import type { CommissionRequestRpcPayload } from "@/features/commission/domain/estimate-request";

export type RepositoryResult<T = undefined> =
  | { data: T; ok: true }
  | { message: string; ok: false };

export type MemberRequestSummary = {
  budgetMaxSatang: number | null;
  budgetMinSatang: number | null;
  id: string;
  requestCode: string;
  requestedDeadline: string | null;
  serviceName: { en: string; th: string };
  status: "cancelled" | "closed" | "converted" | "declined" | "quoted" | "reviewing" | "submitted";
  submittedAt: string;
  usageType: "commercial" | "personal";
};

export type MemberRequestIdentity = {
  contact: { kind: string; value: string };
  nickname: string;
};

type QueryError = { message?: string } | null;
type QueryResult = { data: unknown; error: QueryError };

export type CommissionRequestQuery = {
  eq(column: string, value: string): CommissionRequestQuery;
  maybeSingle(): Promise<QueryResult>;
  order(column: string, options?: { ascending?: boolean }): Promise<QueryResult>;
  select(columns?: string): CommissionRequestQuery;
};

export type CommissionRequestClient = {
  from(table: string): CommissionRequestQuery;
  rpc(name: string, input: Record<string, unknown>): Promise<QueryResult>;
};

const identityProfileSchema = z.object({ nickname: z.string().trim().min(1), user_id: z.string() });
const contactSchema = z.object({
  id: z.string(),
  is_default: z.boolean(),
  kind: z.string().trim().min(1),
  value: z.string().trim().min(1),
});
const requestSummaryRowSchema = z.object({
  budget_max_satang: z.number().int().nullable(),
  budget_min_satang: z.number().int().nullable(),
  id: z.string(),
  request_code: z.string(),
  requested_deadline: z.string().nullable(),
  service_type_name_snapshot: z.object({ en: z.string(), th: z.string() }),
  status: z.enum(["submitted", "reviewing", "quoted", "declined", "cancelled", "converted", "closed"]),
  submitted_at: z.string(),
  usage_type: z.enum(["personal", "commercial"]),
});
const submissionRowSchema = z.object({ request_code: z.string(), request_id: z.string() });

function failure(error?: QueryError | unknown): RepositoryResult<never> {
  const message = error && typeof error === "object" && "message" in error && typeof error.message === "string"
    ? error.message
    : "Unable to complete the request";
  return { message, ok: false };
}

function firstRow(data: unknown) {
  return Array.isArray(data) ? data[0] : data;
}

export function createCommissionRequestRepository(client: CommissionRequestClient) {
  return {
    async cancel(requestId: string): Promise<RepositoryResult> {
      if (!requestId.trim()) return failure();
      const { error } = await client.rpc("cancel_own_commission_request", { p_request_id: requestId });
      return error ? failure(error) : { data: undefined, ok: true };
    },

    async listMine(): Promise<RepositoryResult<MemberRequestSummary[]>> {
      const { data, error } = await client.from("commission_requests")
        .select("id,request_code,service_type_name_snapshot,usage_type,budget_min_satang,budget_max_satang,requested_deadline,status,submitted_at")
        .order("submitted_at", { ascending: false });
      if (error) return failure(error);

      const parsed = z.array(requestSummaryRowSchema).safeParse(Array.isArray(data) ? data : []);
      if (!parsed.success) return failure(parsed.error);
      return {
        data: parsed.data.map((row) => ({
          budgetMaxSatang: row.budget_max_satang,
          budgetMinSatang: row.budget_min_satang,
          id: row.id,
          requestCode: row.request_code,
          requestedDeadline: row.requested_deadline,
          serviceName: row.service_type_name_snapshot,
          status: row.status,
          submittedAt: row.submitted_at,
          usageType: row.usage_type,
        })),
        ok: true,
      };
    },

    async loadMemberIdentity(userId: string, email: string | null): Promise<RepositoryResult<MemberRequestIdentity>> {
      if (!userId.trim()) return failure();
      const [profileResult, contactsResult] = await Promise.all([
        client.from("profiles").select("user_id,nickname").eq("user_id", userId).maybeSingle(),
        client.from("contact_channels").select("id,kind,value,is_default").eq("user_id", userId).order("created_at", { ascending: true }),
      ]);
      if (profileResult.error) return failure(profileResult.error);
      if (contactsResult.error) return failure(contactsResult.error);

      const profile = identityProfileSchema.safeParse(profileResult.data);
      const contacts = z.array(contactSchema).safeParse(Array.isArray(contactsResult.data) ? contactsResult.data : []);
      if (!profile.success || !contacts.success) return failure(!profile.success ? profile.error : contacts.error);
      const contact = contacts.data.find((item) => item.is_default) ?? contacts.data[0]
        ?? (email ? { id: "email-fallback", is_default: true, kind: "email", value: email } : null);
      if (!contact) return failure({ message: "Add a contact channel before submitting" });

      return { data: { contact: { kind: contact.kind, value: contact.value }, nickname: profile.data.nickname }, ok: true };
    },

    async submit(payload: CommissionRequestRpcPayload): Promise<RepositoryResult<{ requestCode: string; requestId: string }>> {
      const { data, error } = await client.rpc("submit_commission_request", { p_payload: payload });
      if (error) return failure(error);
      const parsed = submissionRowSchema.safeParse(firstRow(data));
      return parsed.success
        ? { data: { requestCode: parsed.data.request_code, requestId: parsed.data.request_id }, ok: true }
        : failure(parsed.error);
    },
  };
}

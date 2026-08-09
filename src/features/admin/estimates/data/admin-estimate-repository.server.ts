import "server-only";

import { z } from "zod";

import type { AdminEstimateDetail, AdminEstimateFilters, AdminEstimateSummary } from "@/features/admin/estimates/domain/admin-estimate";
import { createClient } from "@/shared/supabase/server";

type QueryError = { message?: string } | null;
type QueryResult = { data: unknown; error: QueryError };

type AdminEstimateQuery = {
  eq(column: string, value: string): AdminEstimateQuery;
  maybeSingle(): Promise<QueryResult>;
  order(column: string, options?: { ascending?: boolean }): Promise<QueryResult>;
  select(columns: string): AdminEstimateQuery;
};

type AdminEstimateClient = {
  auth: {
    getUser(): Promise<{ data: { user: { app_metadata?: { role?: unknown } } | null }; error: QueryError }>;
  };
  from(table: "commission_requests"): AdminEstimateQuery;
};

const rowSchema = z.object({
  budget_max_satang: z.number().int().nullable(),
  budget_min_satang: z.number().int().nullable(),
  guest_display_name: z.string().trim().min(1).nullable(),
  id: z.string().uuid().or(z.string().min(1)),
  member_display_name_snapshot: z.string().trim().min(1).nullable(),
  request_code: z.string().trim().min(1),
  requester_type: z.enum(["member", "guest"]),
  service_type_name_snapshot: z.object({ en: z.string().trim().min(1), th: z.string().trim().min(1) }),
  status: z.enum(["submitted", "reviewing", "quoted", "declined", "cancelled", "converted", "closed"]),
  submitted_at: z.string().datetime({ offset: true }),
}).superRefine((row, context) => {
  if (row.requester_type === "member" && !row.member_display_name_snapshot) {
    context.addIssue({ code: "custom", message: "Member request is missing its display name" });
  }
  if (row.requester_type === "guest" && !row.guest_display_name) {
    context.addIssue({ code: "custom", message: "Guest request is missing its display name" });
  }
});

const inboxColumns = "id,request_code,requester_type,member_display_name_snapshot,guest_display_name,service_type_name_snapshot,budget_min_satang,budget_max_satang,submitted_at,status";
const detailColumns = "id,request_code,requester_type,member_display_name_snapshot,guest_display_name,contact_snapshot,category_name_snapshot,service_type_name_snapshot,usage_type,budget_min_satang,budget_max_satang,requested_deadline,description,mood_and_style,extra_character_count,background_level,prop_count,submitted_at,status,request_answers(field_key,field_label_snapshot,value,display_order),quotes(id,version,status,total_satang)";

const detailRowSchema = rowSchema.extend({
  background_level: z.number().int().nonnegative(),
  category_name_snapshot: z.object({ en: z.string().trim().min(1), th: z.string().trim().min(1) }),
  contact_snapshot: z.object({ kind: z.string().trim().min(1), value: z.string().trim().min(1) }),
  description: z.string().trim().min(1),
  extra_character_count: z.number().int().nonnegative(),
  mood_and_style: z.string().nullable(),
  prop_count: z.number().int().nonnegative(),
  quotes: z.array(z.object({
    id: z.string().uuid().or(z.string().min(1)),
    status: z.enum(["draft", "sent", "accepted", "declined", "expired", "closed", "superseded"]),
    total_satang: z.number().int().nonnegative(),
    version: z.number().int().positive(),
  })).default([]),
  request_answers: z.array(z.object({
    display_order: z.number().int().nonnegative(),
    field_key: z.string().trim().min(1),
    field_label_snapshot: z.object({ en: z.string().trim().min(1), th: z.string().trim().min(1) }),
    value: z.unknown(),
  })),
  requested_deadline: z.string().nullable(),
  usage_type: z.enum(["personal", "commercial"]),
});

function assertAdmin(authData: { user: { app_metadata?: { role?: unknown } } | null }, authError: QueryError) {
  if (authError || authData.user?.app_metadata?.role !== "admin") throw new Error("Admin access required");
}

export async function listAdminEstimateRequests(filters: AdminEstimateFilters = {}): Promise<AdminEstimateSummary[]> {
  const client = await createClient() as unknown as AdminEstimateClient;
  const { data: authData, error: authError } = await client.auth.getUser();
  assertAdmin(authData, authError);

  let query = client.from("commission_requests").select(inboxColumns);
  if (filters.status) query = query.eq("status", filters.status);
  const { data, error } = await query.order("submitted_at", { ascending: false });
  if (error) throw new Error("Unable to load estimate requests");

  if (!Array.isArray(data)) throw new Error("Admin estimate inbox data is unavailable");
  const parsed = z.array(rowSchema).safeParse(data);
  if (!parsed.success) throw new Error("Admin estimate inbox data is unavailable");

  return parsed.data.map((row) => ({
    budgetMaxSatang: row.budget_max_satang,
    budgetMinSatang: row.budget_min_satang,
    customerDisplayName: row.requester_type === "member" ? row.member_display_name_snapshot! : row.guest_display_name!,
    id: row.id,
    requestCode: row.request_code,
    requesterType: row.requester_type,
    serviceName: row.service_type_name_snapshot,
    status: row.status,
    submittedAt: row.submitted_at,
  }));
}

export async function getAdminEstimateRequest(requestId: string): Promise<AdminEstimateDetail> {
  const client = await createClient() as unknown as AdminEstimateClient;
  const { data: authData, error: authError } = await client.auth.getUser();
  assertAdmin(authData, authError);

  const { data, error } = await client.from("commission_requests").select(detailColumns).eq("id", requestId).maybeSingle();
  if (error) throw new Error("Unable to load estimate request");
  const parsed = detailRowSchema.safeParse(data);
  if (!parsed.success) throw new Error("Admin estimate request is unavailable");

  const row = parsed.data;
  const latestQuote = row.quotes.reduce<(typeof row.quotes)[number] | null>((latest, quote) => !latest || quote.version > latest.version ? quote : latest, null);
  return {
    answers: [...row.request_answers]
      .sort((left, right) => left.display_order - right.display_order)
      .map((answer) => ({ fieldKey: answer.field_key, label: answer.field_label_snapshot, value: answer.value })),
    backgroundLevel: row.background_level,
    budgetMaxSatang: row.budget_max_satang,
    budgetMinSatang: row.budget_min_satang,
    categoryName: row.category_name_snapshot,
    contact: row.contact_snapshot,
    customerDisplayName: row.requester_type === "member" ? row.member_display_name_snapshot! : row.guest_display_name!,
    description: row.description,
    extraCharacterCount: row.extra_character_count,
    id: row.id,
    latestQuote: latestQuote ? { id: latestQuote.id, status: latestQuote.status, totalSatang: latestQuote.total_satang, version: latestQuote.version } : null,
    moodAndStyle: row.mood_and_style,
    propCount: row.prop_count,
    requestCode: row.request_code,
    requestedDeadline: row.requested_deadline,
    requesterType: row.requester_type,
    serviceName: row.service_type_name_snapshot,
    status: row.status,
    submittedAt: row.submitted_at,
    usageType: row.usage_type,
  };
}

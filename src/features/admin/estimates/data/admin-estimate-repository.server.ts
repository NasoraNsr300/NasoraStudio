import "server-only";

import { z } from "zod";

import type { AdminEstimateFilters, AdminEstimateSummary } from "@/features/admin/estimates/domain/admin-estimate";
import { createClient } from "@/shared/supabase/server";

type QueryError = { message?: string } | null;
type QueryResult = { data: unknown; error: QueryError };

type AdminEstimateQuery = {
  eq(column: string, value: string): AdminEstimateQuery;
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

function failureMessage(error: QueryError | unknown) {
  return error && typeof error === "object" && "message" in error && typeof error.message === "string"
    ? error.message
    : "Unable to load estimate requests";
}

export async function listAdminEstimateRequests(filters: AdminEstimateFilters = {}): Promise<AdminEstimateSummary[]> {
  const client = await createClient() as unknown as AdminEstimateClient;
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || authData.user?.app_metadata?.role !== "admin") throw new Error("Admin access required");

  let query = client.from("commission_requests").select(inboxColumns);
  if (filters.status) query = query.eq("status", filters.status);
  const { data, error } = await query.order("submitted_at", { ascending: false });
  if (error) throw new Error(failureMessage(error));

  const parsed = z.array(rowSchema).safeParse(Array.isArray(data) ? data : []);
  if (!parsed.success) throw new Error("Unable to load estimate requests");

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

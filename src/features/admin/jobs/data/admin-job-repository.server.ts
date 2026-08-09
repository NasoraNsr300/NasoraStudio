import "server-only";

import { z } from "zod";

import { isNasoraAdmin } from "@/shared/auth/admin-access";
import { createClient } from "@/shared/supabase/server";

type LocalizedText = { en: string; th: string };
type QueryResult = { data: unknown; error: { message?: string } | null };
type Query = { order(column: string, options?: { ascending?: boolean }): Promise<QueryResult>; select(columns: string): Query };
type AdminJobClient = {
  auth: { getUser(): Promise<{ data: { user: { app_metadata?: Record<string, unknown>; email?: string | null } | null }; error?: unknown }> };
  from(table: "jobs"): Query;
  rpc(name: "admin_create_manual_guest_job", args: Record<string, unknown>): Promise<QueryResult>;
};

const localizedSchema = z.object({ en: z.string().min(1), th: z.string().min(1) });
const rowSchema = z.object({
  customer_type: z.enum(["member", "guest"]),
  deadline: z.string().nullable(),
  deposit_verified_at: z.string().nullable(),
  guest_display_name: z.string().nullable(),
  id: z.string().min(1),
  member_display_name_snapshot: z.string().nullable(),
  service_type_name_snapshot: localizedSchema,
  status_definitions: z.union([z.object({ label: localizedSchema, stable_key: z.string().min(1) }), z.array(z.object({ label: localizedSchema, stable_key: z.string().min(1) })).length(1)]),
});

export type AdminJobSummary = {
  customerDisplayName: string;
  deadline: string | null;
  depositVerifiedAt: string | null;
  id: string;
  serviceName: LocalizedText;
  statusKey: string;
  statusLabel: LocalizedText;
};

async function adminClient() {
  const client = await createClient() as unknown as AdminJobClient;
  const { data, error } = await client.auth.getUser();
  if (error || !isNasoraAdmin(data.user)) throw new Error("Admin access required");
  return client;
}

export async function listAdminJobs(): Promise<AdminJobSummary[]> {
  const client = await adminClient();
  const query = client.from("jobs").select("id,customer_type,member_display_name_snapshot,guest_display_name,service_type_name_snapshot,deadline,deposit_verified_at,status_definitions!status_id(stable_key,label)");
  const { data, error } = await query.order("deposit_verified_at", { ascending: true });
  if (error) throw new Error("Unable to load jobs");
  const parsed = z.array(rowSchema).safeParse(data);
  if (!parsed.success) throw new Error("Admin job data is unavailable");
  return parsed.data.map((row) => {
    const status = Array.isArray(row.status_definitions) ? row.status_definitions[0] : row.status_definitions;
    const customerDisplayName = row.customer_type === "member" ? row.member_display_name_snapshot : row.guest_display_name;
    if (!customerDisplayName) throw new Error("Admin job data is unavailable");
    return { customerDisplayName, deadline: row.deadline, depositVerifiedAt: row.deposit_verified_at, id: row.id, serviceName: row.service_type_name_snapshot, statusKey: status.stable_key, statusLabel: status.label };
  });
}

export async function createManualGuestJob(input: { categoryName: LocalizedText; deadline: string | null; displayName: string; serviceName: LocalizedText; totalSatang: number }) {
  const client = await adminClient();
  const { data, error } = await client.rpc("admin_create_manual_guest_job", {
    p_category_name: input.categoryName,
    p_deadline: input.deadline,
    p_guest_display_name: input.displayName,
    p_service_name: input.serviceName,
    p_total_satang: input.totalSatang,
  });
  if (error) throw new Error("Unable to create Guest job");
  const parsed = z.array(z.object({ job_id: z.string().min(1), queue_entry_id: z.string().min(1) })).length(1).safeParse(data);
  if (!parsed.success) throw new Error("Guest job result is unavailable");
  return { jobId: parsed.data[0].job_id, queueEntryId: parsed.data[0].queue_entry_id };
}

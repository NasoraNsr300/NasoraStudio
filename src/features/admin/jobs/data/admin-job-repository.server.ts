import "server-only";

import { z } from "zod";

import { isNasoraAdmin } from "@/shared/auth/admin-access";
import { createClient } from "@/shared/supabase/server";

type LocalizedText = { en: string; th: string };
type QueryResult = { data: unknown; error: { message?: string } | null };
type AdminJobClient = {
  auth: { getUser(): Promise<{ data: { user: { app_metadata?: Record<string, unknown>; email?: string | null } | null }; error?: unknown }> };
  rpc(name: "admin_list_jobs"): Promise<QueryResult>;
  rpc(name: "admin_create_manual_guest_job", args: Record<string, unknown>): Promise<QueryResult>;
  rpc(name: "admin_change_job_status", args: Record<string, unknown>): Promise<QueryResult>;
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
  status_key: z.string().min(1),
  status_label: localizedSchema,
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
  const { data, error } = await client.rpc("admin_list_jobs");
  if (error) throw new Error("Unable to load jobs");
  const parsed = z.array(rowSchema).safeParse(data);
  if (!parsed.success) throw new Error("Admin job data is unavailable");
  return parsed.data.map((row) => {
    const customerDisplayName = row.customer_type === "member" ? row.member_display_name_snapshot : row.guest_display_name;
    if (!customerDisplayName) throw new Error("Admin job data is unavailable");
    return { customerDisplayName, deadline: row.deadline, depositVerifiedAt: row.deposit_verified_at, id: row.id, serviceName: row.service_type_name_snapshot, statusKey: row.status_key, statusLabel: row.status_label };
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

export async function updateAdminJobStatus(input: { jobId: string; publicNote: string | null; statusKey: string }) {
  const parsed = z.object({ jobId: z.uuid(), publicNote: z.string().trim().max(1_000).nullable(), statusKey: z.enum(["waiting", "sketching", "coloring", "review", "delivery", "completed", "cancelled"]) }).safeParse(input);
  if (!parsed.success) throw new Error("Invalid job status update");
  const client = await adminClient();
  const { error } = await client.rpc("admin_change_job_status", { p_job_id: parsed.data.jobId, p_public_note: parsed.data.publicNote, p_status_key: parsed.data.statusKey });
  if (error) throw new Error("Unable to update job status");
}

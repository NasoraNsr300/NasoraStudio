import "server-only";

import { z } from "zod";

import type { Locale } from "@/shared/i18n/locales";
import { createClient } from "@/shared/supabase/server";

const localizedSchema = z.object({ en: z.string().min(1), th: z.string().min(1) });
const statusSchema = z.union([
  z.object({ customer_visible: z.literal(true), label: localizedSchema }),
  z.array(z.object({ customer_visible: z.literal(true), label: localizedSchema })).length(1),
]);
const rowSchema = z.object({
  accepted_quote_id: z.string().min(1),
  category_name_snapshot: localizedSchema,
  commission_requests: z.object({ id: z.string().min(1), usage_type: z.enum(["personal", "commercial"]) }).optional(),
  deadline: z.string().nullable(),
  default_free_revisions: z.number().int().nonnegative(),
  id: z.string().min(1),
  job_status_history: z.array(z.object({ changed_at: z.string(), id: z.string().min(1), public_note: z.string().nullable(), status_definitions: statusSchema })),
  job_progress_updates: z.array(z.object({ body: z.string(), created_at: z.string(), id: z.string().min(1), image_content_type: z.string().nullable().optional(), title: z.string() })).optional().default([]),
  deliveries: z.array(z.object({ delivered_at: z.string(), display_name: z.string(), expires_at: z.string(), id: z.string().min(1), kind: z.enum(["r2_file", "google_drive"]) })).optional().default([]),
  member_display_name_snapshot: z.string().min(1),
  original_quote_total_satang: z.number().int().nonnegative(),
  payments: z.array(z.object({ amount_satang: z.number().int().nonnegative() })).optional().default([]),
  quotes: z.object({ payments: z.array(z.object({ amount_satang: z.number().int().nonnegative() })).optional() }).optional(),
  service_type_name_snapshot: localizedSchema,
});

export type MemberJobView = {
  code: string;
  deadlineLabel: string;
  freeRevisions: number;
  deliveries?: Array<{ deliveredAt: string; displayName: string; expiresAt: string; id: string; kind: "r2_file" | "google_drive" }>;
  history: Array<{ changedAtLabel: string; id: string; publicNote: string | null; statusLabel: string }>;
  id: string;
  paidSatang: number;
  progressUpdates?: Array<{ body: string; createdAt: string; id: string; imageId?: string; title: string }>;
  quoteId: string;
  requestId: string;
  statusLabel: string;
  title: string;
  totalSatang: number;
  usageType: "personal" | "commercial";
};

function oneStatus(value: z.infer<typeof statusSchema>) { return Array.isArray(value) ? value[0] : value; }

function mapMemberJob(data: unknown, locale: Locale): MemberJobView {
  const parsed = rowSchema.safeParse(data);
  if (!parsed.success) throw new Error("Member job data is unavailable");
  const row = parsed.data;
  const paymentRows = row.quotes?.payments ?? row.payments;
  const visibleHistory = [...row.job_status_history].filter((history) => oneStatus(history.status_definitions).customer_visible).sort((a, b) => a.changed_at.localeCompare(b.changed_at));
  const currentStatus = visibleHistory.at(-1);
  if (!currentStatus || !row.commission_requests) throw new Error("Member job data is unavailable");
  return {
    code: row.id.slice(0, 8).toUpperCase(), deadlineLabel: row.deadline ?? "—", freeRevisions: row.default_free_revisions,
    history: visibleHistory.map((history) => ({ changedAtLabel: history.changed_at, id: history.id, publicNote: history.public_note, statusLabel: oneStatus(history.status_definitions).label[locale] })),
    deliveries: row.deliveries.map((delivery) => ({ deliveredAt: delivery.delivered_at, displayName: delivery.display_name, expiresAt: delivery.expires_at, id: delivery.id, kind: delivery.kind })),
    id: row.id, paidSatang: paymentRows.reduce((sum, payment) => sum + payment.amount_satang, 0), progressUpdates: row.job_progress_updates.map((progress) => ({ body: progress.body, createdAt: progress.created_at, id: progress.id, ...(progress.image_content_type ? { imageId: progress.id } : {}), title: progress.title })), quoteId: row.accepted_quote_id,
    requestId: row.commission_requests.id, statusLabel: oneStatus(currentStatus.status_definitions).label[locale],
    title: `${row.category_name_snapshot[locale]} — ${row.service_type_name_snapshot[locale]}`, totalSatang: row.original_quote_total_satang,
    usageType: row.commission_requests.usage_type,
  };
}

const memberJobSelect = "id,accepted_quote_id,member_display_name_snapshot,category_name_snapshot,service_type_name_snapshot,original_quote_total_satang,default_free_revisions,deadline,job_status_history(id,changed_at,public_note,status_definitions!to_status_id(label,customer_visible)),job_progress_updates(id,title,body,image_content_type,created_at),deliveries(id,kind,display_name,delivered_at,expires_at),commission_requests!request_id(id,usage_type),quotes!accepted_quote_id(payments(amount_satang))";

export async function getMemberJob(jobId: string, locale: Locale): Promise<MemberJobView | null> {
  const client = await createClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  const user = authData.user;
  if (authError || !user) throw new Error("Authentication required");
  const { data, error } = await client.from("jobs")
    .select(memberJobSelect)
    .eq("id", jobId)
    .eq("user_id", user.id)
    .eq("customer_type", "member")
    .maybeSingle();
  if (error) throw new Error("Unable to load member job");
  if (!data) return null;
  return mapMemberJob(data, locale);
}

export async function listMemberJobs(locale: Locale): Promise<MemberJobView[]> {
  const client = await createClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  const user = authData.user;
  if (authError || !user) throw new Error("Authentication required");
  const { data, error } = await client.from("jobs").select(memberJobSelect).eq("user_id", user.id).eq("customer_type", "member").order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load member jobs");
  return (data ?? []).map((row) => mapMemberJob(row, locale));
}

import "server-only";

import { z } from "zod";

import type { Locale } from "@/shared/i18n/locales";
import { createClient } from "@/shared/supabase/server";

const localizedSchema = z.object({ en: z.string().min(1), th: z.string().min(1) });
const statusSchema = z.union([z.object({ label: localizedSchema, stable_key: z.string().min(1).optional() }), z.array(z.object({ label: localizedSchema, stable_key: z.string().min(1).optional() })).length(1)]);
const rowSchema = z.object({
  accepted_quote_id: z.string().min(1),
  category_name_snapshot: localizedSchema,
  commission_requests: z.object({ usage_type: z.enum(["personal", "commercial"]) }).optional(),
  deadline: z.string().nullable(),
  default_free_revisions: z.number().int().nonnegative(),
  id: z.string().min(1),
  job_status_history: z.array(z.object({ changed_at: z.string(), id: z.string().min(1), public_note: z.string().nullable(), status_definitions: statusSchema })),
  member_display_name_snapshot: z.string().min(1),
  original_quote_total_satang: z.number().int().nonnegative(),
  payments: z.array(z.object({ amount_satang: z.number().int().nonnegative() })).optional().default([]),
  quotes: z.object({ payments: z.array(z.object({ amount_satang: z.number().int().nonnegative() })).optional() }).optional(),
  service_type_name_snapshot: localizedSchema,
  status_definitions: statusSchema,
});

export type MemberJobView = {
  code: string;
  deadlineLabel: string;
  freeRevisions: number;
  history: Array<{ changedAtLabel: string; id: string; publicNote: string | null; statusLabel: string }>;
  id: string;
  paidSatang: number;
  statusLabel: string;
  title: string;
  totalSatang: number;
  usageType: "personal" | "commercial";
};

function oneStatus(value: z.infer<typeof statusSchema>) { return Array.isArray(value) ? value[0] : value; }

export async function getMemberJob(jobId: string, locale: Locale): Promise<MemberJobView | null> {
  const client = await createClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  const user = authData.user;
  if (authError || !user) throw new Error("Authentication required");
  const { data, error } = await client.from("jobs")
    .select("id,accepted_quote_id,member_display_name_snapshot,category_name_snapshot,service_type_name_snapshot,original_quote_total_satang,default_free_revisions,deadline,status_definitions!status_id(stable_key,label),job_status_history(id,changed_at,public_note,status_definitions!to_status_id(label)),commission_requests!request_id(usage_type),quotes!accepted_quote_id(payments(amount_satang))")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .eq("customer_type", "member")
    .maybeSingle();
  if (error) throw new Error("Unable to load member job");
  if (!data) return null;
  const parsed = rowSchema.safeParse(data);
  if (!parsed.success) throw new Error("Member job data is unavailable");
  const row = parsed.data;
  const paymentRows = row.quotes?.payments ?? row.payments;
  return {
    code: row.id.slice(0, 8).toUpperCase(),
    deadlineLabel: row.deadline ?? "—",
    freeRevisions: row.default_free_revisions,
    history: [...row.job_status_history].sort((a, b) => a.changed_at.localeCompare(b.changed_at)).map((history) => ({ changedAtLabel: history.changed_at, id: history.id, publicNote: history.public_note, statusLabel: oneStatus(history.status_definitions).label[locale] })),
    id: row.id,
    paidSatang: paymentRows.reduce((sum, payment) => sum + payment.amount_satang, 0),
    statusLabel: oneStatus(row.status_definitions).label[locale],
    title: `${row.category_name_snapshot[locale]} — ${row.service_type_name_snapshot[locale]}`,
    totalSatang: row.original_quote_total_satang,
    usageType: row.commission_requests?.usage_type ?? "personal",
  };
}

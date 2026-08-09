import "server-only";

import { z } from "zod";

import type { Locale } from "@/shared/i18n/locales";
import { createClient } from "@/shared/supabase/server";
import type { PublicQueueItem } from "@/shared/types/public-content";

const localizedSchema = z.object({ en: z.string().min(1), th: z.string().min(1) });
const rowSchema = z.object({
  customer_display_name: z.string().min(1),
  deadline: z.string().nullable(),
  position: z.coerce.number().int().positive(),
  service_type_name_snapshot: localizedSchema,
  status_label_snapshot: localizedSchema,
});

export async function listPublicQueue(locale: Locale): Promise<PublicQueueItem[]> {
  const client = await createClient();
  const { data, error } = await client.from("public_queue")
    .select("position,customer_display_name,service_type_name_snapshot,status_label_snapshot,deadline")
    .order("position", { ascending: true });
  if (error) throw new Error("Unable to load public queue");
  const parsed = z.array(rowSchema).safeParse(data);
  if (!parsed.success) throw new Error("Public queue data is unavailable");
  return parsed.data.map((row) => ({
    deadlineLabel: row.deadline ?? "—",
    displayName: row.customer_display_name,
    position: row.position,
    serviceName: row.service_type_name_snapshot[locale],
    statusLabel: row.status_label_snapshot[locale],
  }));
}

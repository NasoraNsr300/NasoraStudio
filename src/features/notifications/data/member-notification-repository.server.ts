import "server-only";

import { z } from "zod";

import type { Locale } from "@/shared/i18n/locales";
import { createClient } from "@/shared/supabase/server";

const localized = z.object({ en: z.string(), th: z.string() });
const rowSchema = z.object({ body: localized, created_at: z.string(), id: z.string(), read_at: z.string().nullable(), target_url: z.string().startsWith("/"), title: localized });
export type MemberNotificationView = { body: string; createdAt: string; id: string; read: boolean; targetUrl: string; title: string };

export async function listMemberNotifications(locale: Locale): Promise<MemberNotificationView[]> {
  const client = await createClient(); const { data: auth, error: authError } = await client.auth.getUser(); if (authError || !auth.user) throw new Error("Authentication required");
  const { data, error } = await client.from("notifications").select("id,title,body,target_url,created_at,read_at").eq("recipient_user_id", auth.user.id).is("archived_at", null).order("created_at", { ascending: false }).limit(20);
  if (error) throw new Error("Unable to load notifications");
  return z.array(rowSchema).parse(data ?? []).map((row) => ({ body: row.body[locale], createdAt: row.created_at, id: row.id, read: row.read_at !== null, targetUrl: row.target_url.replace(/^\/(th|en)\//, `/${locale}/`), title: row.title[locale] }));
}

export async function markMemberNotificationsRead() {
  const client = await createClient(); const { data: auth, error: authError } = await client.auth.getUser(); if (authError || !auth.user) throw new Error("Authentication required");
  const { error } = await client.rpc("member_mark_notifications_read"); if (error) throw new Error("Unable to update notifications");
}

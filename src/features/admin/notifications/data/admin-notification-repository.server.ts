import "server-only";

import { z } from "zod";

import { listAdminEstimateRequests } from "@/features/admin/estimates/data/admin-estimate-repository.server";
import { listAdminJobs } from "@/features/admin/jobs/data/admin-job-repository.server";
import type { AdminNotificationFeed, AdminNotificationItem, AdminShellData } from "@/features/admin/notifications/domain/admin-notification";
import { listAdminConversations, type ConversationView } from "@/features/collaboration/data/collaboration-repository.server";
import { createAdminPaymentRepository, type AdminPaymentClient } from "@/features/payments/data/admin-payment-repository.server";
import { isNasoraAdmin } from "@/shared/auth/admin-access";
import { createClient } from "@/shared/supabase/server";

type EstimateRow = { customerDisplayName: string; id: string; status: string; submittedAt: string };
type JobRow = { customerDisplayName: string; deadline: string | null; id: string; statusKey: string; statusLabel: { en: string; th: string } };
type SlipRow = { id: string; requestId: string; uploadedAt: string };
export type AdminNotificationDependencies = {
  listConversations(): Promise<ConversationView[]>;
  listEstimates(): Promise<EstimateRow[]>;
  listJobs(): Promise<JobRow[]>;
  listPendingSlips(): Promise<SlipRow[]>;
  listReadKeys(): Promise<Set<string>>;
  now: Date;
};

type AdminClient = {
  auth: { getUser(): Promise<{ data: { user: { app_metadata?: Record<string, unknown>; email?: string | null; id: string } | null }; error?: unknown }> };
  from(name: "admin_notification_reads"): { select(columns: string): { eq(column: string, value: string): Promise<{ data: unknown; error: { message?: string } | null }> } };
  rpc(name: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { message?: string } | null }>;
};

async function authenticatedAdminClient() {
  const client = await createClient() as unknown as AdminClient;
  const { data, error } = await client.auth.getUser();
  if (error || !isNasoraAdmin(data.user)) throw new Error("Admin access required");
  return { client, user: data.user! };
}

export async function listAdminPendingSlips(): Promise<SlipRow[]> {
  const { client } = await authenticatedAdminClient();
  const rows = await createAdminPaymentRepository(client as unknown as AdminPaymentClient).listPending({ limit: 25 });
  return rows.map(({ id, requestId, uploadedAt }) => ({ id, requestId, uploadedAt }));
}

async function listReadKeys(): Promise<Set<string>> {
  const { client, user } = await authenticatedAdminClient();
  const { data, error } = await client.from("admin_notification_reads").select("source_key").eq("admin_user_id", user.id);
  if (error) throw new Error("Unable to load Admin notification reads");
  const rows = z.array(z.object({ source_key: z.string() })).parse(data ?? []);
  return new Set(rows.map((row) => row.source_key));
}

function dateAtBangkokMidnight(value: string) {
  return new Date(`${value}T00:00:00+07:00`).getTime();
}

function isNearDeadline(deadline: string | null, now: Date) {
  if (!deadline) return false;
  const delta = dateAtBangkokMidnight(deadline) - now.getTime();
  return delta >= -24 * 60 * 60 * 1_000 && delta <= 7 * 24 * 60 * 60 * 1_000;
}

export async function buildAdminNotificationFeed(dependencies: AdminNotificationDependencies): Promise<AdminNotificationFeed> {
  const [estimates, slips, conversations, jobs, readKeys] = await Promise.all([
    dependencies.listEstimates(), dependencies.listPendingSlips(), dependencies.listConversations(), dependencies.listJobs(), dependencies.listReadKeys(),
  ]);
  const items: AdminNotificationItem[] = [];

  for (const estimate of estimates.filter((row) => row.status === "submitted")) {
    const id = `estimate:${estimate.id}`;
    items.push({ detail: `แบบประเมินใหม่จาก ${estimate.customerDisplayName}`, href: "/admin/estimates", id, kind: "estimate", occurredAt: estimate.submittedAt, read: readKeys.has(id), title: "มีแบบประเมินใหม่" });
  }
  for (const slip of slips) {
    const id = `slip:${slip.id}`;
    items.push({ detail: `คำขอ ${slip.requestId.slice(0, 8)} อัปโหลดสลิปแล้ว`, href: "/admin/payments", id, kind: "slip", occurredAt: slip.uploadedAt, read: readKeys.has(id), title: "มีสลิปรอตรวจสอบ" });
  }
  for (const conversation of conversations.filter((row) => row.unreadCount > 0 && row.lastMessageAt)) {
    const lastMessageId = conversation.messages.at(-1)?.id ?? conversation.id;
    const id = `message:${conversation.id}:${lastMessageId}`;
    items.push({ detail: `${conversation.customerName ?? "สมาชิก"} ส่ง ${conversation.unreadCount} ข้อความ`, href: "/admin/messages", id, kind: "message", occurredAt: conversation.lastMessageAt!, read: readKeys.has(id), title: "มีข้อความใหม่" });
  }
  for (const job of jobs.filter((row) => !["cancelled", "completed"].includes(row.statusKey) && isNearDeadline(row.deadline, dependencies.now))) {
    const id = `deadline:${job.id}`;
    items.push({ detail: `${job.customerDisplayName} — ${job.statusLabel.th}`, href: "/admin/jobs", id, kind: "deadline", occurredAt: new Date(`${job.deadline}T00:00:00+07:00`).toISOString(), read: readKeys.has(id), title: "ใกล้ถึงกำหนดส่ง" });
  }

  items.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  return { items: items.slice(0, 20), unreadMessages: conversations.reduce((total, conversation) => total + conversation.unreadCount, 0) };
}

export async function getAdminNotificationFeed() {
  return buildAdminNotificationFeed({ listConversations: listAdminConversations, listEstimates: listAdminEstimateRequests, listJobs: listAdminJobs, listPendingSlips: listAdminPendingSlips, listReadKeys, now: new Date() });
}

export async function getAdminShellData(input: { adminEmail: string; adminImageUrl: string | null }): Promise<AdminShellData> {
  const feed = await getAdminNotificationFeed();
  return { ...input, notifications: feed.items, unreadMessages: feed.unreadMessages };
}

export async function markAdminNotificationsRead(notificationIds: string[]) {
  const ids = z.array(z.string().regex(/^(estimate|slip|message|deadline):[0-9a-f-]{36}(:[0-9a-f-]{36})?$/)).min(1).max(50).parse(notificationIds);
  const { client } = await authenticatedAdminClient();
  const { error } = await client.rpc("admin_mark_notification_reads", { p_source_keys: ids });
  if (error) throw new Error("Unable to mark Admin notifications read");
}

export async function markAdminConversationRead(conversationId: string) {
  const id = z.uuid().parse(conversationId);
  const { client } = await authenticatedAdminClient();
  const { error } = await client.rpc("admin_mark_conversation_read", { p_conversation_id: id });
  if (error) throw new Error("Unable to mark conversation read");
}

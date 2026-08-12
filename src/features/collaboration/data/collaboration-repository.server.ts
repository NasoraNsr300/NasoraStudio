import "server-only";

import { z } from "zod";

import { isNasoraAdmin } from "@/shared/auth/admin-access";
import { createClient } from "@/shared/supabase/server";
import { createPaymentGatewayClient } from "@/features/payments/data/payment-gateway-client.server";

type QueryResult = { data: unknown; error: { message?: string } | null };
type RpcClient = {
  auth: { getUser(): Promise<{ data: { user: { app_metadata?: Record<string, unknown>; email?: string | null; id: string } | null }; error?: unknown }> };
  rpc(name: string, args?: Record<string, unknown>): Promise<QueryResult>;
};

const localizedSchema = z.object({ en: z.string().min(1), th: z.string().min(1) });
const jobRelationSchema = z.union([
  z.object({ member_display_name_snapshot: z.string().nullable(), category_name_snapshot: localizedSchema, service_type_name_snapshot: localizedSchema }),
  z.array(z.object({ member_display_name_snapshot: z.string().nullable(), category_name_snapshot: localizedSchema, service_type_name_snapshot: localizedSchema })).length(1),
]);
const conversationRowSchema = z.object({
  id: z.string().min(1),
  job_id: z.string().min(1),
  jobs: jobRelationSchema,
  last_message_at: z.string().nullable(),
  messages: z.array(z.object({ body: z.string(), created_at: z.string(), id: z.string().min(1), message_assets: z.array(z.object({ id: z.string().min(1) })).optional().default([]), sender_role: z.enum(["member", "admin", "system"]) })).default([]),
  conversation_reads: z.array(z.object({ last_read_at: z.string(), user_id: z.string().min(1) })).default([]),
});

export type ConversationView = {
  customerName?: string;
  id: string;
  jobId: string;
  lastMessageAt: string | null;
  messages: Array<{ body: string; createdAt: string; id: string; imageAssetId?: string; senderRole: "member" | "admin" | "system" }>;
  title: string;
  unreadCount: number;
};

function one<T>(value: T | T[]) { return Array.isArray(value) ? value[0] : value; }
function mapConversation(value: unknown, locale: "th" | "en", admin: boolean, currentUserId: string): ConversationView {
  const row = conversationRowSchema.parse(value);
  const job = one(row.jobs);
  const messages = [...row.messages].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const lastReadAt = row.conversation_reads.find((read) => read.user_id === currentUserId)?.last_read_at ?? null;
  const unreadCount = messages.filter((message) => (admin ? message.sender_role === "member" : message.sender_role !== "member") && (!lastReadAt || message.created_at > lastReadAt)).length;
  return {
    ...(admin ? { customerName: job.member_display_name_snapshot ?? "Member" } : {}),
    id: row.id,
    jobId: row.job_id,
    lastMessageAt: row.last_message_at ?? messages.at(-1)?.created_at ?? null,
    messages: messages.map((message) => ({ body: message.body, createdAt: message.created_at, id: message.id, ...(message.message_assets[0] ? { imageAssetId: message.message_assets[0].id } : {}), senderRole: message.sender_role })),
    title: `${job.category_name_snapshot[locale]} — ${job.service_type_name_snapshot[locale]}`,
    unreadCount,
  };
}

const idResult = (key: string) => z.array(z.record(z.string(), z.unknown())).length(1).transform((rows, context) => {
  const value = rows[0]?.[key];
  if (typeof value !== "string" || value.length < 1) {
    context.addIssue({ code: "custom", message: "Invalid command result" });
    return z.NEVER;
  }
  return value;
});

async function userClient() {
  const client = await createClient() as unknown as RpcClient;
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Authentication required");
  return { client, user: data.user };
}

async function adminClient() {
  const result = await userClient();
  if (!isNasoraAdmin(result.user)) throw new Error("Admin access required");
  return result.client;
}

async function adminContext() {
  const result = await userClient();
  if (!isNasoraAdmin(result.user)) throw new Error("Admin access required");
  return result;
}

export async function postMemberJobMessage(input: { body: string; jobId: string }) {
  const parsed = z.object({ body: z.string().trim().min(1).max(4_000), jobId: z.uuid() }).parse(input);
  const { client } = await userClient();
  const { data, error } = await client.rpc("member_send_job_message", { p_body: parsed.body, p_job_id: parsed.jobId });
  if (error) throw new Error("Unable to send message");
  return { id: idResult("message_id").parse(data) };
}

type ImageInput = { contentType: string; etag: string; objectKey: string; sizeBytes: number };
export async function assertMemberConversation(jobId: string) {
  const parsedId = z.uuid().parse(jobId); const { client } = await userClient();
  const queryClient = client as unknown as { from(name: string): { select(columns: string): { eq(column: string, value: string): { maybeSingle(): Promise<QueryResult> } } } };
  const { data, error } = await queryClient.from("conversations").select("id").eq("job_id", parsedId).maybeSingle();
  if (error || !data) throw new Error("Conversation unavailable");
}

export async function postMemberJobMessageWithImage(input: { body: string; jobId: string; image: ImageInput }) {
  const parsed = z.object({ body: z.string().trim().min(1).max(4_000), jobId: z.uuid(), image: z.object({ contentType: z.enum(["image/png", "image/jpeg", "image/webp"]), etag: z.string().min(1), objectKey: z.string().regex(/^message-images\/[0-9a-f-]+\.(png|jpg|webp)$/), sizeBytes: z.number().int().min(1).max(5 * 1024 * 1024) }) }).parse(input);
  const { client } = await userClient(); const { data, error } = await client.rpc("member_send_job_message_with_image", { p_body: parsed.body, p_content_type: parsed.image.contentType, p_etag: parsed.image.etag, p_job_id: parsed.jobId, p_object_key: parsed.image.objectKey, p_size_bytes: parsed.image.sizeBytes });
  if (error) throw new Error("Unable to send message"); return { id: idResult("message_id").parse(data) };
}

export async function postAdminJobMessage(input: { body: string; jobId: string }) {
  const parsed = z.object({ body: z.string().trim().min(1).max(4_000), jobId: z.uuid() }).parse(input);
  const client = await adminClient();
  const { data, error } = await client.rpc("admin_send_job_message", { p_body: parsed.body, p_job_id: parsed.jobId });
  if (error) throw new Error("Unable to send message");
  return { id: idResult("message_id").parse(data) };
}

export async function postAdminJobMessageWithImage(input: { body: string; jobId: string; image: ImageInput }) {
  const parsed = z.object({ body: z.string().trim().min(1).max(4_000), jobId: z.uuid(), image: z.object({ contentType: z.enum(["image/png", "image/jpeg", "image/webp"]), etag: z.string().min(1), objectKey: z.string().regex(/^message-images\/[0-9a-f-]+\.(png|jpg|webp)$/), sizeBytes: z.number().int().min(1).max(5 * 1024 * 1024) }) }).parse(input);
  const client = await adminClient(); const { data, error } = await client.rpc("admin_send_job_message_with_image", { p_body: parsed.body, p_content_type: parsed.image.contentType, p_etag: parsed.image.etag, p_job_id: parsed.jobId, p_object_key: parsed.image.objectKey, p_size_bytes: parsed.image.sizeBytes });
  if (error) throw new Error("Unable to send message"); return { id: idResult("message_id").parse(data) };
}

export async function postAdminProgress(input: { body: string; jobId: string; title: string }) {
  const parsed = z.object({ body: z.string().trim().min(1).max(4_000), jobId: z.uuid(), title: z.string().trim().min(1).max(160) }).parse(input);
  const client = await adminClient();
  const { data, error } = await client.rpc("admin_post_job_progress", { p_body: parsed.body, p_job_id: parsed.jobId, p_title: parsed.title });
  if (error) throw new Error("Unable to post progress");
  return { id: idResult("progress_id").parse(data) };
}

export async function postAdminProgressWithImage(input: { body: string; jobId: string; title: string; image: ImageInput }) {
  const parsed = z.object({ body: z.string().trim().min(1).max(4_000), jobId: z.uuid(), title: z.string().trim().min(1).max(160), image: z.object({ contentType: z.enum(["image/png", "image/jpeg", "image/webp"]), etag: z.string().min(1), objectKey: z.string().regex(/^progress-images\/[0-9a-f-]+\.(png|jpg|webp)$/), sizeBytes: z.number().int().min(1).max(5 * 1024 * 1024) }) }).parse(input);
  const client = await adminClient(); const { data, error } = await client.rpc("admin_post_job_progress_with_image", { p_body: parsed.body, p_content_type: parsed.image.contentType, p_etag: parsed.image.etag, p_job_id: parsed.jobId, p_object_key: parsed.image.objectKey, p_size_bytes: parsed.image.sizeBytes, p_title: parsed.title });
  if (error) throw new Error("Unable to post progress"); return { id: idResult("progress_id").parse(data) };
}

export async function createAdminDelivery(input: { displayName: string; jobId: string; kind: "google_drive"; url: string }) {
  const parsed = z.object({ displayName: z.string().trim().min(1).max(240), jobId: z.uuid(), kind: z.literal("google_drive"), url: z.url().startsWith("https://drive.google.com/") }).parse(input);
  const client = await adminClient();
  const { data, error } = await client.rpc("admin_create_drive_delivery", { p_display_name: parsed.displayName, p_job_id: parsed.jobId, p_url: parsed.url });
  if (error) throw new Error("Unable to create delivery");
  return { deliveryId: idResult("delivery_id").parse(data) };
}

export async function assertCollaborationAdmin() { await adminClient(); }

export async function createAdminFileDelivery(input: { contentType: string; displayName: string; etag: string; jobId: string; objectKey: string; sizeBytes: number }) {
  const parsed = z.object({ contentType: z.string().trim().min(1).max(120), displayName: z.string().trim().min(1).max(240), etag: z.string().trim().min(1).max(240), jobId: z.uuid(), objectKey: z.string().regex(/^deliveries\/[0-9a-f-]+\/[^/]+$/), sizeBytes: z.number().int().min(1).max(25 * 1024 * 1024) }).parse(input);
  const client = await adminClient();
  const { data, error } = await client.rpc("admin_create_file_delivery", { p_content_type: parsed.contentType, p_display_name: parsed.displayName, p_etag: parsed.etag, p_job_id: parsed.jobId, p_object_key: parsed.objectKey, p_size_bytes: parsed.sizeBytes });
  if (error) throw new Error("Unable to create delivery");
  return { deliveryId: idResult("delivery_id").parse(data) };
}

const deliverySchema = z.object({ external_url: z.string().url().nullable(), id: z.string().min(1), kind: z.enum(["r2_file", "google_drive"]), object_key: z.string().nullable() });
export async function getMemberDeliveryDownload(deliveryId: string) {
  const asset = await privateAsset("delivery", deliveryId); if (!asset) return null;
  return deliverySchema.parse({ external_url: asset.external_url, id: deliveryId, kind: asset.asset_kind, object_key: asset.object_key });
}

const conversationSelect = "id,job_id,last_message_at,jobs!job_id(member_display_name_snapshot,category_name_snapshot,service_type_name_snapshot),messages(id,body,sender_role,created_at,message_assets(id)),conversation_reads(user_id,last_read_at)";

async function privateAsset(kind: "delivery" | "message_asset" | "progress_image", id: string) {
  const parsedId = z.uuid().parse(id); const { user } = await userClient(); const gateway = createPaymentGatewayClient();
  const { data, error } = await gateway.rpc("gateway_get_private_asset", { p_admin: isNasoraAdmin(user), p_id: parsedId, p_kind: kind, p_user_id: user.id });
  if (error) throw new Error("Unable to load private asset");
  return z.array(z.object({ asset_kind: z.enum(["r2_file", "google_drive"]), external_url: z.string().nullable(), object_key: z.string().nullable() })).max(1).parse(data ?? [])[0] ?? null;
}

export async function getMemberMessageAssetKey(assetId: string) { return (await privateAsset("message_asset", assetId))?.object_key ?? null; }
export async function getMemberProgressImageKey(progressId: string) { return (await privateAsset("progress_image", progressId))?.object_key ?? null; }

export async function listMemberConversations(locale: "th" | "en"): Promise<ConversationView[]> {
  const { client, user } = await userClient();
  const queryClient = client as unknown as { from(name: string): { select(columns: string): { order(column: string, options: { ascending: boolean }): Promise<QueryResult> } } };
  const { data, error } = await queryClient.from("conversations").select(conversationSelect).order("last_message_at", { ascending: false });
  if (error) throw new Error("Unable to load messages");
  return z.array(z.unknown()).parse(data ?? []).map((row) => mapConversation(row, locale, false, user.id));
}

export async function listAdminConversations(): Promise<ConversationView[]> {
  const { client, user } = await adminContext();
  const queryClient = client as unknown as { from(name: string): { select(columns: string): { order(column: string, options: { ascending: boolean }): Promise<QueryResult> } } };
  const { data, error } = await queryClient.from("conversations").select(conversationSelect).order("last_message_at", { ascending: false });
  if (error) throw new Error("Unable to load messages");
  return z.array(z.unknown()).parse(data ?? []).map((row) => mapConversation(row, "th", true, user.id));
}

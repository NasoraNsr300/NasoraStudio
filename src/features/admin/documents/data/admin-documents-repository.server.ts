import "server-only";

import { z } from "zod";

import { isNasoraAdmin } from "@/shared/auth/admin-access";
import { createClient } from "@/shared/supabase/server";
import { mapAdminDocument, publicDocumentRowSchema, type SaveAdminDocumentInput } from "@/features/documents/domain/document";
import { publicDocumentSelect } from "@/features/documents/data/public-documents-repository.server";

type QueryResult = { data: unknown; error: { message?: string; code?: string } | null };
type Query = { eq(column: string, value: unknown): Query; maybeSingle(): Promise<QueryResult>; order(column: string, options: { ascending: boolean }): Promise<QueryResult>; select(columns: string): Query };
type AdminDocumentsClient = { auth: { getUser(): Promise<{ data: { user: { app_metadata?: Record<string, unknown>; email?: string | null } | null }; error?: unknown }> }; from(table: "public_documents"): Query; rpc(name: string, args: Record<string, unknown>): Promise<QueryResult> };

async function adminClient() {
  const client = await createClient() as unknown as AdminDocumentsClient;
  const { data, error } = await client.auth.getUser();
  if (error || !isNasoraAdmin(data.user)) throw new Error("Admin access required");
  return client;
}

export async function listAdminDocuments() {
  const client = await adminClient();
  const { data, error } = await client.from("public_documents").select(publicDocumentSelect).order("display_order", { ascending: true });
  if (error) throw new Error("Unable to load documents");
  const parsed = publicDocumentRowSchema.array().safeParse(data);
  if (!parsed.success) throw new Error("Admin documents data is unavailable");
  return parsed.data.map((row) => {
    try { return mapAdminDocument(row); } catch { throw new Error("Admin documents data is unavailable"); }
  }).sort((left, right) => left.displayOrder - right.displayOrder || left.slug.localeCompare(right.slug));
}

export async function getAdminDocument(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const client = await adminClient();
  const { data, error } = await client.from("public_documents").select(publicDocumentSelect).eq("id", id).maybeSingle();
  if (error) throw new Error("Unable to load document");
  if (!data) return null;
  const parsed = publicDocumentRowSchema.safeParse(data);
  if (!parsed.success) throw new Error("Admin documents data is unavailable");
  try { return mapAdminDocument(parsed.data); } catch { throw new Error("Admin documents data is unavailable"); }
}

export async function saveAdminDocument(input: SaveAdminDocumentInput) {
  const client = await adminClient();
  const { data, error } = await client.rpc("admin_save_public_document", { p_category: input.category, p_content: input.content, p_cover_media_id: input.coverMediaId, p_display_order: input.displayOrder, p_document_id: input.id, p_pinned: input.pinned, p_published: input.published, p_slug: input.slug, p_summary: input.summary, p_tags: input.tags, p_title: input.title });
  if (error?.message?.includes("document_slug_conflict") || error?.code === "23505") throw new Error("Document slug already exists");
  if (error) throw new Error("Unable to save document");
  const parsed = z.uuid().safeParse(data);
  if (!parsed.success) throw new Error("Document result is unavailable");
  return parsed.data;
}

export async function archiveAdminDocument(input: { archived: boolean; documentId: string; reason: string | null }) {
  const client = await adminClient();
  const { error } = await client.rpc("admin_set_public_document_archive", { p_archived: input.archived, p_document_id: input.documentId, p_reason: input.reason });
  if (error) throw new Error("Unable to update document archive state");
}

export async function createAdminDocumentMedia(input: { alt: { en: string; th: string }; contentType: "image/jpeg" | "image/png" | "image/webp"; etag: string; height: number; objectKey: string; width: number }) {
  const client = await adminClient();
  const { data, error } = await client.rpc("admin_create_document_media", { p_alt: input.alt, p_content_type: input.contentType, p_etag: input.etag, p_height: input.height, p_object_key: input.objectKey, p_width: input.width });
  if (error) throw new Error("Unable to register document cover");
  const parsed = z.uuid().safeParse(data);
  if (!parsed.success) throw new Error("Document cover result is unavailable");
  return parsed.data;
}

export type { SaveAdminDocumentInput };

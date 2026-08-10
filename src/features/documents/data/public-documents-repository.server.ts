import "server-only";

import type { Locale } from "@/shared/i18n/locales";
import { createClient } from "@/shared/supabase/server";
import { mapPublicDocument, publicDocumentRowSchema } from "@/features/documents/domain/document";
import { richTextPlainText } from "@/features/documents/domain/rich-text";

type QueryResult = { data: unknown; error: { message?: string } | null };
type Query = { eq(column: string, value: unknown): Query; is(column: string, value: null): Query; maybeSingle(): Promise<QueryResult>; order(column: string, options: { ascending: boolean }): Promise<QueryResult>; select(columns: string): Query };
type DocumentsClient = { from(table: "commission_catalog_media" | "public_documents"): Query };

export const publicDocumentSelect = "id,slug,category,title,summary,content,tags,pinned,display_order,published,archived_at,updated_at,commission_catalog_media(id,alt,content_type,width,height)";
async function client() { return await createClient() as unknown as DocumentsClient; }

export async function listPublicDocuments(locale: Locale, query?: string) {
  const documentsClient = await client();
  const request = documentsClient.from("public_documents").select(publicDocumentSelect).eq("published", true).is("archived_at", null);
  const { data, error } = await request.order("display_order", { ascending: true });
  if (error) throw new Error("Unable to load public documents");
  const parsed = publicDocumentRowSchema.array().safeParse(data);
  if (!parsed.success) throw new Error("Public documents data is unavailable");
  const term = query?.trim().toLocaleLowerCase(locale) ?? "";
  return parsed.data.map((row) => {
    try { return mapPublicDocument(row); } catch { throw new Error("Public documents data is unavailable"); }
  }).filter((document) => !term || [document.title[locale], document.summary[locale], richTextPlainText(document.content[locale]), ...document.tags.map((tag) => tag[locale])].some((value) => value.toLocaleLowerCase(locale).includes(term)))
    .sort((left, right) => Number(right.pinned) - Number(left.pinned) || left.displayOrder - right.displayOrder || left.slug.localeCompare(right.slug));
}

export async function getPublicDocument(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  const documentsClient = await client();
  const { data, error } = await documentsClient.from("public_documents").select(publicDocumentSelect).eq("slug", slug).eq("published", true).is("archived_at", null).maybeSingle();
  if (error) throw new Error("Unable to load public document");
  if (!data) return null;
  const parsed = publicDocumentRowSchema.safeParse(data);
  if (!parsed.success) throw new Error("Public documents data is unavailable");
  try { return mapPublicDocument(parsed.data); } catch { throw new Error("Public documents data is unavailable"); }
}

export async function getPublicDocumentCoverObject(id: string) {
  if (!/^[-0-9a-f]{36}$/i.test(id)) return null;
  const documentsClient = await client();
  const { data, error } = await documentsClient.from("commission_catalog_media").select("object_key,content_type").eq("id", id).is("archived_at", null).maybeSingle();
  if (error) throw new Error("Unable to load document cover");
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  if (typeof row.object_key !== "string" || !/^document-covers\/[0-9a-f-]{36}\.(png|jpg|webp)$/i.test(row.object_key)) return null;
  if (!( ["image/jpeg", "image/png", "image/webp"] as unknown[]).includes(row.content_type)) return null;
  return { contentType: row.content_type as string, objectKey: row.object_key };
}

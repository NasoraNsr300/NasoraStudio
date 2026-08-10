import "server-only";

import { catalogAlbumRowSchema, mapPublicAlbum } from "@/features/catalog/domain/catalog";
import type { Locale } from "@/shared/i18n/locales";
import { createClient } from "@/shared/supabase/server";

type QueryResult = { data: unknown; error: { message?: string } | null };
type Query = {
  eq(column: string, value: unknown): Query;
  is(column: string, value: null): Query;
  maybeSingle(): Promise<QueryResult>;
  order(column: string, options: { ascending: boolean }): Promise<QueryResult>;
  select(columns: string): Query;
};
type PublicCatalogClient = { from(table: "commission_albums"): Query };

export const catalogSelect = `
  id,slug,name,description,availability,recommended,published,display_order,archived_at,
  commission_catalog_media(id,alt,content_type,width,height),
  commission_services(
    id,album_id,slug,name,description,timing_guidance,availability,free_revision_count,
    modifiers,document_slugs,published,display_order,archived_at,
    commission_catalog_media(id,alt,content_type,width,height),
    commission_service_prices(service_id,usage,pace,label,amount_satang,display_order)
  )
`;

async function client() {
  return await createClient() as unknown as PublicCatalogClient;
}

function parseCatalog(data: unknown) {
  const parsed = catalogAlbumRowSchema.array().safeParse(data);
  if (!parsed.success) throw new Error("Public catalog data is unavailable");
  return parsed.data.sort((left, right) => left.display_order - right.display_order);
}

export async function listPublicAlbums(_locale: Locale) {
  const catalogClient = await client();
  const query = catalogClient.from("commission_albums").select(catalogSelect).eq("published", true).is("archived_at", null);
  const { data, error } = await query.order("display_order", { ascending: true });
  if (error) throw new Error("Unable to load public catalog");
  const mapped = parseCatalog(data).map(mapPublicAlbum);
  return { categories: mapped.map((item) => item.category), types: mapped.flatMap((item) => item.types) };
}

export async function getPublicAlbum(_locale: Locale, slug: string) {
  const catalogClient = await client();
  const query = catalogClient.from("commission_albums").select(catalogSelect)
    .eq("slug", slug).eq("published", true).is("archived_at", null);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error("Unable to load public catalog");
  if (!data) return null;
  const parsed = catalogAlbumRowSchema.safeParse(data);
  if (!parsed.success) throw new Error("Public catalog data is unavailable");
  return mapPublicAlbum(parsed.data);
}


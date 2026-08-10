import "server-only";

import { z } from "zod";

import { catalogAlbumRowSchema, mapAdminAlbum } from "@/features/catalog/domain/catalog";
import type { LocalizedText } from "@/features/catalog/domain/catalog";
import { catalogSelect } from "@/features/catalog/data/public-catalog-repository.server";
import { isNasoraAdmin } from "@/shared/auth/admin-access";
import { createClient } from "@/shared/supabase/server";

type QueryResult = { data: unknown; error: { message?: string } | null };
type Query = {
  eq(column: string, value: unknown): Query;
  maybeSingle(): Promise<QueryResult>;
  order(column: string, options: { ascending: boolean }): Promise<QueryResult>;
  select(columns: string): Query;
};
type AdminCatalogClient = {
  auth: { getUser(): Promise<{ data: { user: { app_metadata?: Record<string, unknown>; email?: string | null } | null }; error?: unknown }> };
  from(table: "commission_albums"): Query;
  rpc(name: string, args: Record<string, unknown>): Promise<QueryResult>;
};

export type SaveAdminAlbumInput = {
  availability: "open" | "limited" | "closed";
  coverMediaId: string | null;
  description: LocalizedText;
  displayOrder: number;
  id: string | null;
  name: LocalizedText;
  published: boolean;
  recommended: boolean;
  slug: string;
};

export type SaveAdminServiceInput = {
  albumId: string;
  availability: "open" | "limited" | "closed";
  coverMediaId: string | null;
  description: LocalizedText;
  displayOrder: number;
  documentSlugs: string[];
  freeRevisionCount: number;
  id: string | null;
  modifiers: Array<{ kind: "fixed" | "percentage"; label: LocalizedText; value: number }>;
  name: LocalizedText;
  published: boolean;
  slug: string;
  timingGuidance: LocalizedText;
};

export type CatalogPriceInput = {
  amountSatang: number;
  displayOrder: number;
  label: LocalizedText;
  pace: "normal" | "rush";
  usage: "personal" | "commercial";
};

async function adminClient() {
  const client = await createClient() as unknown as AdminCatalogClient;
  const { data, error } = await client.auth.getUser();
  if (error || !isNasoraAdmin(data.user)) throw new Error("Admin access required");
  return client;
}

export async function listAdminAlbums() {
  const client = await adminClient();
  const { data, error } = await client.from("commission_albums").select(catalogSelect).order("display_order", { ascending: true });
  if (error) throw new Error("Unable to load catalog albums");
  const parsed = catalogAlbumRowSchema.array().safeParse(data);
  if (!parsed.success) throw new Error("Admin catalog data is unavailable");
  return parsed.data.map(mapAdminAlbum).sort((left, right) => left.displayOrder - right.displayOrder);
}

export async function getAdminAlbum(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const client = await adminClient();
  const { data, error } = await client.from("commission_albums").select(catalogSelect).eq("id", id).maybeSingle();
  if (error) throw new Error("Unable to load catalog album");
  if (!data) return null;
  const parsed = catalogAlbumRowSchema.safeParse(data);
  if (!parsed.success) throw new Error("Admin catalog data is unavailable");
  return mapAdminAlbum(parsed.data);
}

export async function saveAdminAlbum(input: SaveAdminAlbumInput) {
  const client = await adminClient();
  const { data, error } = await client.rpc("admin_save_commission_album", {
    p_album_id: input.id,
    p_availability: input.availability,
    p_cover_media_id: input.coverMediaId,
    p_description: input.description,
    p_display_order: input.displayOrder,
    p_name: input.name,
    p_published: input.published,
    p_recommended: input.recommended,
    p_slug: input.slug,
  });
  if (error) throw new Error(error.message?.includes("duplicate key") ? "Catalog slug already exists" : "Unable to save catalog album");
  const parsed = z.uuid().safeParse(data);
  if (!parsed.success) throw new Error("Catalog album result is unavailable");
  return parsed.data;
}

export async function archiveAdminAlbum(input: { albumId: string; archived: boolean; reason: string | null }) {
  const client = await adminClient();
  const { error } = await client.rpc("admin_set_commission_album_archive", {
    p_album_id: input.albumId,
    p_archived: input.archived,
    p_reason: input.reason,
  });
  if (error) throw new Error("Unable to update catalog album archive state");
}

export async function saveAdminService(input: SaveAdminServiceInput) {
  const client = await adminClient();
  const { data, error } = await client.rpc("admin_save_commission_service", {
    p_album_id: input.albumId,
    p_availability: input.availability,
    p_cover_media_id: input.coverMediaId,
    p_description: input.description,
    p_display_order: input.displayOrder,
    p_document_slugs: input.documentSlugs,
    p_free_revision_count: input.freeRevisionCount,
    p_modifiers: input.modifiers,
    p_name: input.name,
    p_published: input.published,
    p_service_id: input.id,
    p_slug: input.slug,
    p_timing_guidance: input.timingGuidance,
  });
  if (error) throw new Error(error.message?.includes("duplicate key") ? "Service slug already exists" : "Unable to save catalog service");
  const parsed = z.uuid().safeParse(data);
  if (!parsed.success) throw new Error("Catalog service result is unavailable");
  return parsed.data;
}

export async function archiveAdminService(input: { archived: boolean; reason: string | null; serviceId: string }) {
  const client = await adminClient();
  const { error } = await client.rpc("admin_set_commission_service_archive", {
    p_archived: input.archived,
    p_reason: input.reason,
    p_service_id: input.serviceId,
  });
  if (error) throw new Error("Unable to update catalog service archive state");
}

export async function replaceAdminServicePrices(serviceId: string, prices: CatalogPriceInput[]) {
  const client = await adminClient();
  const { error } = await client.rpc("admin_replace_commission_service_prices", {
    p_prices: prices.map((price) => ({
      amount_satang: price.amountSatang,
      display_order: price.displayOrder,
      label: price.label,
      pace: price.pace,
      usage: price.usage,
    })),
    p_service_id: serviceId,
  });
  if (error) throw new Error("Unable to save catalog prices");
}


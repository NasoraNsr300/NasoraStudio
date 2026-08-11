import "server-only";

import { z } from "zod";

import {
  mapAdminPortfolioItem,
  portfolioItemRowSchema,
  type LocalizedPortfolioText,
} from "@/features/portfolio/domain/portfolio";
import { portfolioSelect } from "@/features/portfolio/data/public-portfolio-repository.server";
import { isNasoraAdmin } from "@/shared/auth/admin-access";
import { createClient } from "@/shared/supabase/server";

type QueryResult = { data: unknown; error: { message?: string } | null };
type Query = {
  eq(column: string, value: unknown): Query;
  maybeSingle(): Promise<QueryResult>;
  order(column: string, options: { ascending: boolean }): Promise<QueryResult>;
  select(columns: string): Query;
};
type AdminPortfolioClient = {
  auth: { getUser(): Promise<{ data: { user: { app_metadata?: Record<string, unknown>; email?: string | null } | null }; error?: unknown }> };
  from(table: "portfolio_items"): Query;
  rpc(name: string, args: Record<string, unknown>): Promise<QueryResult>;
};

export type SaveAdminPortfolioItemInput = {
  albumId: string;
  displayOrder: number;
  featured: boolean;
  id: string | null;
  mediaId: string;
  published: boolean;
  showInHero: boolean;
  title: LocalizedPortfolioText;
};

async function adminClient() {
  const client = await createClient() as unknown as AdminPortfolioClient;
  const { data, error } = await client.auth.getUser();
  if (error || !isNasoraAdmin(data.user)) throw new Error("Admin access required");
  return client;
}
export async function assertPortfolioAdmin() {
  await adminClient();
}

export async function createAdminPortfolioMedia(input: {
  alt: LocalizedPortfolioText;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  etag: string;
  height: number;
  objectKey: string;
  width: number;
}) {
  const client = await adminClient();
  const { data, error } = await client.rpc("admin_create_portfolio_media", {
    p_alt: input.alt,
    p_content_type: input.contentType,
    p_etag: input.etag,
    p_height: input.height,
    p_object_key: input.objectKey,
    p_width: input.width,
  });
  if (error) throw new Error("Unable to register portfolio media");
  const parsed = z.uuid().safeParse(data);
  if (!parsed.success) throw new Error("Portfolio media result is unavailable");
  return parsed.data;
}

export async function listAdminPortfolio() {
  const client = await adminClient();
  const { data, error } = await client.from("portfolio_items").select(portfolioSelect)
    .order("display_order", { ascending: true });
  if (error) throw new Error("Unable to load portfolio items");
  const parsed = portfolioItemRowSchema.array().safeParse(data);
  if (!parsed.success) throw new Error("Admin portfolio data is unavailable");
  return parsed.data.map(mapAdminPortfolioItem)
    .sort((left, right) => left.displayOrder - right.displayOrder || left.id.localeCompare(right.id));
}

export async function getAdminPortfolioItem(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const client = await adminClient();
  const { data, error } = await client.from("portfolio_items").select(portfolioSelect).eq("id", id).maybeSingle();
  if (error) throw new Error("Unable to load portfolio item");
  if (!data) return null;
  const parsed = portfolioItemRowSchema.safeParse(data);
  if (!parsed.success) throw new Error("Admin portfolio data is unavailable");
  return mapAdminPortfolioItem(parsed.data);
}

export async function saveAdminPortfolioItem(input: SaveAdminPortfolioItemInput) {
  const client = await adminClient();
  const { data, error } = await client.rpc("admin_save_portfolio_item", {
    p_album_id: input.albumId,
    p_display_order: input.displayOrder,
    p_featured: input.featured,
    p_item_id: input.id,
    p_media_id: input.mediaId,
    p_published: input.published,
    p_show_in_hero: input.showInHero,
    p_title: input.title,
  });
  if (error) throw new Error("Unable to save portfolio item");
  const parsed = z.uuid().safeParse(data);
  if (!parsed.success) throw new Error("Portfolio item result is unavailable");
  return parsed.data;
}

export async function archiveAdminPortfolioItem(input: { archived: boolean; itemId: string; reason: string | null }) {
  const client = await adminClient();
  const { error } = await client.rpc("admin_set_portfolio_item_archive", {
    p_archived: input.archived,
    p_item_id: input.itemId,
    p_reason: input.reason,
  });
  if (error) throw new Error("Unable to update portfolio archive state");
}

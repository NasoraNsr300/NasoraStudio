import "server-only";

import {
  mapPublicPortfolioItem,
  portfolioItemRowSchema,
} from "@/features/portfolio/domain/portfolio";
import { createClient } from "@/shared/supabase/server";

type QueryResult = { data: unknown; error: { message?: string } | null };
type Query = {
  eq(column: string, value: unknown): Query;
  is(column: string, value: null): Query;
  maybeSingle(): Promise<QueryResult>;
  order(column: string, options: { ascending: boolean }): Promise<QueryResult>;
  select(columns: string): Query;
};
type PortfolioClient = {
  from(table: "commission_catalog_media" | "portfolio_items"): Query;
};

export const portfolioSelect = `
  id,title,featured,show_in_hero,display_order,published,archived_at,
  commission_albums(id,slug,name),
  commission_catalog_media(id,alt,content_type,width,height)
`;

async function client() {
  return await createClient() as unknown as PortfolioClient;
}
export async function listPublicPortfolio() {
  const portfolioClient = await client();
  const query = portfolioClient.from("portfolio_items").select(portfolioSelect)
    .eq("published", true).is("archived_at", null);
  const { data, error } = await query.order("display_order", { ascending: true });
  if (error) throw new Error("Unable to load public portfolio");
  const parsed = portfolioItemRowSchema.array().safeParse(data);
  if (!parsed.success) throw new Error("Public portfolio data is unavailable");
  return parsed.data
    .map(mapPublicPortfolioItem)
    .sort((left, right) => left.displayOrder - right.displayOrder || left.id.localeCompare(right.id));
}

export async function getPublicPortfolioMediaObject(id: string) {
  if (!/^[-0-9a-f]{36}$/i.test(id)) return null;
  const portfolioClient = await client();
  const { data, error } = await portfolioClient.from("commission_catalog_media")
    .select("object_key,content_type").eq("id", id).is("archived_at", null).maybeSingle();
  if (error) throw new Error("Unable to load portfolio media");
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  if (typeof row.object_key !== "string" || !/^portfolio\/[0-9a-f-]{36}\.(png|jpg|webp)$/i.test(row.object_key)) return null;
  if (!(["image/jpeg", "image/png", "image/webp"] as unknown[]).includes(row.content_type)) return null;
  return { contentType: row.content_type as string, objectKey: row.object_key };
}

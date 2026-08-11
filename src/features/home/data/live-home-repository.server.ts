import "server-only";

import { mapPortfolioFeatured, mapPortfolioHero } from "@/features/home/domain/home-content";
import { mapPublicPortfolioItem, portfolioItemRowSchema } from "@/features/portfolio/domain/portfolio";
import { portfolioSelect } from "@/features/portfolio/data/public-portfolio-repository.server";
import { getPublicSiteSettings } from "@/features/site-settings/data/public-site-settings-repository.server";
import type { Locale } from "@/shared/i18n/locales";
import { createClient } from "@/shared/supabase/server";

type QueryResult = { data: unknown; error: { message?: string } | null };
type Query = {
  eq(column: string, value: unknown): Query;
  is(column: string, value: null): Query;
  order(column: string, options: { ascending: boolean }): Promise<QueryResult>;
  select(columns: string): Query;
};
type HomeClient = { from(table: "portfolio_items"): Query };

export async function getLiveHomeContent(locale: Locale) {
  void locale;
  const [client, settings] = await Promise.all([
    createClient() as Promise<unknown> as Promise<HomeClient>,
    getPublicSiteSettings(),
  ]);
  const query = client.from("portfolio_items").select(portfolioSelect)
    .eq("published", true).is("archived_at", null);
  const { data, error } = await query.order("display_order", { ascending: true });
  if (error) throw new Error("Unable to load live Home content");
  const parsed = portfolioItemRowSchema.array().safeParse(data);
  if (!parsed.success) throw new Error("Live Home content is unavailable");
  const portfolio = parsed.data.map(mapPublicPortfolioItem);
  return {
    featured: portfolio.filter((item) => item.featured).map(mapPortfolioFeatured),
    hero: portfolio.filter((item) => item.showInHero).map((item) => mapPortfolioHero(item, settings)),
    settings,
  };
}

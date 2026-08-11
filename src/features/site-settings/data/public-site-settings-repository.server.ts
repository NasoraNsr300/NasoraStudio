import "server-only";

import {
  projectPublicSiteSettings,
  publicSiteSettingsRowSchema,
  type PublicSiteSettings,
} from "@/features/site-settings/domain/site-settings";
import { createClient } from "@/shared/supabase/server";

type QueryResult = { data: unknown; error: { message?: string } | null };
type Query = {
  eq(column: string, value: unknown): Query;
  maybeSingle(): Promise<QueryResult>;
  select(columns: string): Query;
};
type SiteSettingsClient = { from(table: "site_settings"): Query };

export const publicSiteSettingsColumns = [
  "business_hours",
  "commissions_open",
  "discord_contact",
  "home_description",
  "home_heading",
  "particles_enabled",
  "queue_capacity",
  "shooting_stars_enabled",
  "updated_at",
].join(",");

export async function getPublicSiteSettings(clientOverride?: SiteSettingsClient): Promise<PublicSiteSettings> {
  const client = clientOverride ?? await createClient() as unknown as SiteSettingsClient;
  const { data, error } = await client.from("site_settings")
    .select(publicSiteSettingsColumns)
    .eq("id", true)
    .maybeSingle();
  if (error) throw new Error("Unable to load site settings");
  const parsed = publicSiteSettingsRowSchema.safeParse(data);
  if (!parsed.success) throw new Error("Site settings are unavailable");
  return projectPublicSiteSettings(parsed.data);
}

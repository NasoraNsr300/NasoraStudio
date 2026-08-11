import "server-only";

import { z } from "zod";

import {
  projectAdminSiteSettings,
  saveAdminSiteSettingsSchema,
  siteSettingsRowSchema,
  type AdminSiteSettings,
  type SaveAdminSiteSettingsInput,
} from "@/features/site-settings/domain/site-settings";
import { isNasoraAdmin } from "@/shared/auth/admin-access";
import { createClient } from "@/shared/supabase/server";

type QueryResult = { data: unknown; error: { message?: string } | null };
type AdminSettingsClient = {
  auth: { getUser(): Promise<{ data: { user: { app_metadata?: Record<string, unknown>; email?: string | null } | null }; error?: unknown }> };
  rpc(name: string, args?: Record<string, unknown>): Promise<QueryResult>;
};

async function adminClient(clientOverride?: AdminSettingsClient) {
  const client = clientOverride ?? await createClient() as unknown as AdminSettingsClient;
  const { data, error } = await client.auth.getUser();
  if (error || !isNasoraAdmin(data.user)) throw new Error("Admin access required");
  return client;
}

function firstRow(data: unknown) {
  return Array.isArray(data) ? data[0] : data;
}

function parseAdminSettings(data: unknown): AdminSiteSettings {
  const parsed = siteSettingsRowSchema.safeParse(firstRow(data));
  if (!parsed.success) throw new Error("Admin site settings are unavailable");
  return projectAdminSiteSettings(parsed.data);
}

export async function getAdminSiteSettings(clientOverride?: AdminSettingsClient) {
  const client = await adminClient(clientOverride);
  const { data, error } = await client.rpc("admin_get_site_settings");
  if (error) throw new Error("Unable to load Admin site settings");
  return parseAdminSettings(data);
}

export async function saveAdminSiteSettings(input: SaveAdminSiteSettingsInput, clientOverride?: AdminSettingsClient) {
  const parsed = saveAdminSiteSettingsSchema.parse(input);
  const client = await adminClient(clientOverride);
  const { data, error } = await client.rpc("admin_save_site_settings", {
    p_admin_note: parsed.adminNote,
    p_business_hours: parsed.businessHours,
    p_commissions_open: parsed.commissionsOpen,
    p_discord_contact: parsed.discordContact,
    p_home_description: parsed.homeDescription,
    p_home_heading: parsed.homeHeading,
    p_particles_enabled: parsed.particlesEnabled,
    p_queue_capacity: parsed.queueCapacity,
    p_shooting_stars_enabled: parsed.shootingStarsEnabled,
  });
  if (error) throw new Error("Unable to save Admin site settings");
  return parseAdminSettings(data);
}

export async function saveAdminCommissionAvailability(open: boolean, clientOverride?: AdminSettingsClient) {
  const value = z.boolean().parse(open);
  const client = await adminClient(clientOverride);
  const { data, error } = await client.rpc("admin_set_commissions_open", { p_commissions_open: value });
  if (error) throw new Error("Unable to save commission availability");
  const parsed = z.boolean().safeParse(data);
  if (!parsed.success) throw new Error("Commission availability result is unavailable");
  return parsed.data;
}

export async function saveAdminPersonalNote(note: string, clientOverride?: AdminSettingsClient) {
  const value = z.string().trim().max(2_000).parse(note);
  const current = await getAdminSiteSettings(clientOverride);
  return saveAdminSiteSettings({
    adminNote: value,
    businessHours: current.businessHours,
    commissionsOpen: current.commissionsOpen,
    discordContact: current.discordContact,
    homeDescription: current.homeDescription,
    homeHeading: current.homeHeading,
    particlesEnabled: current.particlesEnabled,
    queueCapacity: current.queueCapacity,
    shootingStarsEnabled: current.shootingStarsEnabled,
  }, clientOverride);
}

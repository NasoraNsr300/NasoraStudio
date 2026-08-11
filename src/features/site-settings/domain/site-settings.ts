import { z } from "zod";

import type { LocalizedText } from "@/shared/types/public-content";

const localizedTextSchema = z.object({
  en: z.string().trim().min(1).max(1_000),
  th: z.string().trim().min(1).max(1_000),
}).strict();

export const publicSiteSettingsRowSchema = z.object({
  business_hours: z.string().trim().min(1).max(120),
  commissions_open: z.boolean(),
  discord_contact: z.string().trim().min(1).max(200),
  home_description: localizedTextSchema,
  home_heading: localizedTextSchema,
  particles_enabled: z.boolean(),
  queue_capacity: z.number().int().min(1).max(100),
  shooting_stars_enabled: z.boolean(),
  updated_at: z.iso.datetime({ offset: true }),
}).strict();

export const siteSettingsRowSchema = publicSiteSettingsRowSchema.extend({
  admin_note: z.string().max(2_000),
}).strict();

export const saveAdminSiteSettingsSchema = z.object({
  adminNote: z.string().trim().max(2_000),
  businessHours: z.string().trim().min(1).max(120),
  commissionsOpen: z.boolean(),
  discordContact: z.string().trim().min(1).max(200),
  homeDescription: localizedTextSchema,
  homeHeading: localizedTextSchema,
  particlesEnabled: z.boolean(),
  queueCapacity: z.number().int().min(1).max(100),
  shootingStarsEnabled: z.boolean(),
}).strict();

export type SiteSettingsRow = z.infer<typeof siteSettingsRowSchema>;
export type SaveAdminSiteSettingsInput = z.infer<typeof saveAdminSiteSettingsSchema>;

export type PublicSiteSettings = {
  businessHours: string;
  commissionsOpen: boolean;
  discordContact: string;
  homeDescription: LocalizedText;
  homeHeading: LocalizedText;
  particlesEnabled: boolean;
  queueCapacity: number;
  shootingStarsEnabled: boolean;
};

export type AdminSiteSettings = PublicSiteSettings & {
  adminNote: string;
  updatedAt: string;
};

export function projectPublicSiteSettings(row: z.infer<typeof publicSiteSettingsRowSchema>): PublicSiteSettings {
  return {
    businessHours: row.business_hours,
    commissionsOpen: row.commissions_open,
    discordContact: row.discord_contact,
    homeDescription: row.home_description,
    homeHeading: row.home_heading,
    particlesEnabled: row.particles_enabled,
    queueCapacity: row.queue_capacity,
    shootingStarsEnabled: row.shooting_stars_enabled,
  };
}

export function projectAdminSiteSettings(row: SiteSettingsRow): AdminSiteSettings {
  return {
    ...projectPublicSiteSettings(row),
    adminNote: row.admin_note,
    updatedAt: row.updated_at,
  };
}

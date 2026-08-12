import { z } from "zod";

import type { LocalizedText } from "@/shared/types/public-content";

const localizedTextSchema = z.object({
  en: z.string().trim().min(1).max(1_000),
  th: z.string().trim().min(1).max(1_000),
}).strict();

const defaultAboutBiography = {
  en: "Nasora is an independent illustrator creating character-led artwork, stories, and commission pieces with a warm, atmospheric finish.",
  th: "Nasora เป็นนักวาดอิสระที่สร้างสรรค์งานตัวละคร เรื่องราว และคอมมิชชันในบรรยากาศอบอุ่นนุ่มนวล",
};
const defaultAboutContact = {
  en: "For commission questions, availability, or a friendly hello, start with Discord.",
  th: "หากมีคำถามเกี่ยวกับคอมมิชชัน คิว หรืออยากทักทาย เริ่มต้นพูดคุยที่ Discord ได้เลย",
};

export const publicSiteSettingsRowSchema = z.object({
  about_biography: localizedTextSchema.default(defaultAboutBiography),
  about_contact: localizedTextSchema.default(defaultAboutContact),
  business_hours: z.string().trim().min(1).max(120),
  commissions_open: z.boolean(),
  discord_contact: z.string().trim().min(1).max(200),
  contact_email: z.email().max(320).default("nasora.nsr300@gmail.com"),
  instagram_url: z.union([z.url().max(500), z.literal("")]).default(""),
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
  aboutBiography: localizedTextSchema.default(defaultAboutBiography),
  aboutContact: localizedTextSchema.default(defaultAboutContact),
  adminNote: z.string().trim().max(2_000),
  businessHours: z.string().trim().min(1).max(120),
  commissionsOpen: z.boolean(),
  discordContact: z.string().trim().min(1).max(200),
  contactEmail: z.email().max(320).default("nasora.nsr300@gmail.com"),
  instagramUrl: z.union([z.url().max(500), z.literal("")]).default(""),
  homeDescription: localizedTextSchema,
  homeHeading: localizedTextSchema,
  particlesEnabled: z.boolean(),
  queueCapacity: z.number().int().min(1).max(100),
  shootingStarsEnabled: z.boolean(),
}).strict();

export type SiteSettingsRow = z.infer<typeof siteSettingsRowSchema>;
export type SaveAdminSiteSettingsInput = z.infer<typeof saveAdminSiteSettingsSchema>;

export type PublicSiteSettings = {
  aboutBiography?: LocalizedText;
  aboutContact?: LocalizedText;
  businessHours: string;
  commissionsOpen: boolean;
  discordContact: string;
  contactEmail?: string;
  instagramUrl?: string;
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
    aboutBiography: row.about_biography,
    aboutContact: row.about_contact,
    businessHours: row.business_hours,
    commissionsOpen: row.commissions_open,
    discordContact: row.discord_contact,
    contactEmail: row.contact_email,
    instagramUrl: row.instagram_url,
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

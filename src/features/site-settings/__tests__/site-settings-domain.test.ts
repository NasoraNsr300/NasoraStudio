import { describe, expect, it } from "vitest";

import {
  projectAdminSiteSettings,
  projectPublicSiteSettings,
  siteSettingsRowSchema,
} from "@/features/site-settings/domain/site-settings";

const row = {
  admin_note: "ตรวจคิวก่อนเปิดรับเพิ่ม",
  business_hours: "11:00 – 22:00",
  commissions_open: false,
  discord_contact: "nasora.studio",
  home_description: { en: "Stories made visible", th: "ถ่ายทอดเรื่องราวให้มองเห็น" },
  home_heading: { en: "Draw your world", th: "รับวาดภาพในโลกของคุณ" },
  particles_enabled: true,
  queue_capacity: 10,
  shooting_stars_enabled: true,
  updated_at: "2026-08-12T00:00:00.000Z",
};

describe("site settings domain", () => {
  it("projects only customer-safe fields for public readers", () => {
    const projected = projectPublicSiteSettings(siteSettingsRowSchema.parse(row));

    expect(projected).toEqual({
      aboutBiography: {
        en: "Nasora is an independent illustrator creating character-led artwork, stories, and commission pieces with a warm, atmospheric finish.",
        th: "Nasora เป็นนักวาดอิสระที่สร้างสรรค์งานตัวละคร เรื่องราว และคอมมิชชันในบรรยากาศอบอุ่นนุ่มนวล",
      },
      aboutContact: {
        en: "For commission questions, availability, or a friendly hello, start with Discord.",
        th: "หากมีคำถามเกี่ยวกับคอมมิชชัน คิว หรืออยากทักทาย เริ่มต้นพูดคุยที่ Discord ได้เลย",
      },
      businessHours: "11:00 – 22:00",
      commissionsOpen: false,
      discordContact: "nasora.studio",
      contactEmail: "nasora.nsr300@gmail.com",
      homeDescription: { en: "Stories made visible", th: "ถ่ายทอดเรื่องราวให้มองเห็น" },
      homeHeading: { en: "Draw your world", th: "รับวาดภาพในโลกของคุณ" },
      instagramUrl: "",
      particlesEnabled: true,
      queueCapacity: 10,
      shootingStarsEnabled: true,
    });
    expect(projected).not.toHaveProperty("adminNote");
  });

  it("keeps the private note only in the Admin projection", () => {
    expect(projectAdminSiteSettings(siteSettingsRowSchema.parse(row))).toMatchObject({
      adminNote: "ตรวจคิวก่อนเปิดรับเพิ่ม",
      updatedAt: "2026-08-12T00:00:00.000Z",
    });
  });

  it("rejects malformed localized content, queue capacity, and unknown fields", () => {
    expect(siteSettingsRowSchema.safeParse({ ...row, home_heading: { th: "ไทย" } }).success).toBe(false);
    expect(siteSettingsRowSchema.safeParse({ ...row, queue_capacity: 0 }).success).toBe(false);
    expect(siteSettingsRowSchema.safeParse({ ...row, unsafe: true }).success).toBe(false);
  });
});

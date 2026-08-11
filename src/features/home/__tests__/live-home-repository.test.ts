import { describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({ createClient: vi.fn() }));
const settingsRepository = vi.hoisted(() => ({ getPublicSiteSettings: vi.fn() }));
vi.mock("@/shared/supabase/server", () => supabase);
vi.mock("@/features/site-settings/data/public-site-settings-repository.server", () => settingsRepository);

import { getLiveHomeContent } from "@/features/home/data/live-home-repository.server";

const itemId = "00000000-0000-4000-8000-000000000701";
const albumId = "00000000-0000-4000-8000-000000000702";
const mediaId = "00000000-0000-4000-8000-000000000703";

function queryResult(data: unknown) {
  const query = {
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(async () => ({ data, error: null })),
    select: vi.fn(() => query),
  };
  return query;
}

const settings = {
  businessHours: "11:00 – 22:00",
  commissionsOpen: true,
  discordContact: "nasora.studio",
  homeDescription: { en: "Stories", th: "เรื่องราว" },
  homeHeading: { en: "Draw your world", th: "รับวาดภาพในโลกของคุณ" },
  particlesEnabled: true,
  queueCapacity: 10,
  shootingStarsEnabled: true,
};

describe("live Home repository", () => {
  it("maps published Portfolio rows into Hero and featured content", async () => {
    const query = queryResult([{
      archived_at: null,
      commission_albums: { id: albumId, name: { en: "Illustration", th: "ภาพประกอบ" }, slug: "illustration" },
      commission_catalog_media: { alt: { en: "Star", th: "ดาว" }, content_type: "image/webp", height: 1200, id: mediaId, width: 1600 },
      display_order: 2,
      featured: true,
      id: itemId,
      published: true,
      show_in_hero: true,
      title: { en: "Star", th: "ดาว" },
    }]);
    supabase.createClient.mockResolvedValue({ from: vi.fn(() => query) });
    settingsRepository.getPublicSiteSettings.mockResolvedValue(settings);

    await expect(getLiveHomeContent("th")).resolves.toEqual({
      featured: [expect.objectContaining({ displayOrder: 2, id: itemId })],
      hero: [expect.objectContaining({ enabled: true, id: itemId })],
      settings,
    });
    expect(query.eq).toHaveBeenCalledWith("published", true);
    expect(query.is).toHaveBeenCalledWith("archived_at", null);
  });
});

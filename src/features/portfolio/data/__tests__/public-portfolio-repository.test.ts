import { describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/shared/supabase/server", () => supabase);

import {
  getPublicPortfolioMediaObject,
  listPublicPortfolio,
} from "@/features/portfolio/data/public-portfolio-repository.server";

const itemId = "00000000-0000-4000-8000-000000000501";
const albumId = "00000000-0000-4000-8000-000000000502";
const mediaId = "00000000-0000-4000-8000-000000000503";

function itemRow(overrides: Record<string, unknown> = {}) {
  return {
    archived_at: null,
    commission_albums: { id: albumId, name: { en: "Illustration", th: "ภาพประกอบ" }, slug: "illustration" },
    commission_catalog_media: {
      alt: { en: "Starlight", th: "แสงดาว" },
      content_type: "image/webp",
      height: 900,
      id: mediaId,
      width: 1600,
    },
    display_order: 1,
    featured: true,
    id: itemId,
    published: true,
    show_in_hero: false,
    title: { en: "Starlight", th: "แสงดาว" },
    ...overrides,
  };
}

function queryResult(data: unknown) {
  const query = {
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: Array.isArray(data) ? data[0] ?? null : data, error: null })),
    order: vi.fn(async () => ({ data, error: null })),
    select: vi.fn(() => query),
  };
  return query;
}

describe("public portfolio repository", () => {
  it("maps published ordered rows without fixture media", async () => {
    const query = queryResult([itemRow()]);
    supabase.createClient.mockResolvedValue({ from: vi.fn(() => query) });

    const result = await listPublicPortfolio();

    expect(query.eq).toHaveBeenCalledWith("published", true);
    expect(query.is).toHaveBeenCalledWith("archived_at", null);
    expect(result).toEqual([expect.objectContaining({
      category: "illustration",
      id: itemId,
      media: expect.objectContaining({
        detailSrc: `/api/portfolio/media/${mediaId}`,
        height: 900,
        width: 1600,
      }),
      title: { en: "Starlight", th: "แสงดาว" },
    })]);
  });

  it("fails closed on missing media relation", async () => {
    const query = queryResult([itemRow({ commission_catalog_media: null })]);
    supabase.createClient.mockResolvedValue({ from: vi.fn(() => query) });
    await expect(listPublicPortfolio()).rejects.toThrow("Public portfolio data is unavailable");
  });

  it("returns only validated portfolio object keys", async () => {
    const found = queryResult({ content_type: "image/webp", object_key: `portfolio/${mediaId}.webp` });
    supabase.createClient.mockResolvedValueOnce({ from: vi.fn(() => found) });
    await expect(getPublicPortfolioMediaObject(mediaId)).resolves.toEqual({
      contentType: "image/webp",
      objectKey: `portfolio/${mediaId}.webp`,
    });

    const unsafe = queryResult({ content_type: "image/webp", object_key: "payment-slips/private.webp" });
    supabase.createClient.mockResolvedValueOnce({ from: vi.fn(() => unsafe) });
    await expect(getPublicPortfolioMediaObject(mediaId)).resolves.toBeNull();
  });
});

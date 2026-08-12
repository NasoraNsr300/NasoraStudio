import { describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/shared/supabase/server", () => supabase);

import { getPublicAlbum, listPublicAlbums } from "@/features/catalog/data/public-catalog-repository.server";

const albumId = "00000000-0000-4000-8000-000000000101";
const serviceId = "00000000-0000-4000-8000-000000000102";
const serviceMediaId = "00000000-0000-4000-8000-000000000103";

function albumRow(overrides: Record<string, unknown> = {}) {
  return {
    archived_at: null,
    availability: "open",
    commission_catalog_media: null,
    commission_services: [{
      album_id: albumId,
      archived_at: null,
      availability: "open",
      commission_catalog_media: null,
      commission_service_prices: [{
        amount_satang: 140000,
        display_order: 1,
        label: { en: "Personal Normal", th: "ส่วนตัว ปกติ" },
        pace: "normal",
        service_id: serviceId,
        usage: "personal",
      }],
      description: { en: "Full body", th: "เต็มตัว" },
      display_order: 1,
      document_slugs: ["commission-terms"],
      free_revision_count: 4,
      id: serviceId,
      modifiers: [],
      name: { en: "Chibi Full Body", th: "Chibi Full Body" },
      published: true,
      slug: "chibi-full-body",
      timing_guidance: { en: "7 days", th: "7 วัน" },
    }],
    description: { en: "Cute characters", th: "ตัวละครน่ารัก" },
    display_order: 1,
    id: albumId,
    name: { en: "Chibi", th: "Chibi" },
    published: true,
    recommended: true,
    slug: "chibi",
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

describe("public catalog repository", () => {
  it("maps ordered active rows to public album and service models without fixture media", async () => {
    const query = queryResult([albumRow()]);
    supabase.createClient.mockResolvedValue({ from: vi.fn(() => query) });

    const catalog = await listPublicAlbums("th");

    expect(query.eq).toHaveBeenCalledWith("published", true);
    expect(query.is).toHaveBeenCalledWith("archived_at", null);
    expect(catalog.categories).toEqual([
      expect.objectContaining({ coverMedia: undefined, slug: "chibi", typeCount: 1 }),
    ]);
    expect(catalog.types).toEqual([
      expect.objectContaining({
        categorySlug: "chibi",
        referencePrices: [expect.objectContaining({ amountThb: 1400, pace: "normal", usage: "personal" })],
        slug: "chibi-full-body",
      }),
    ]);
  });

  it("maps a saved service cover into the public card and detail example", async () => {
    const row = albumRow();
    (row.commission_services[0] as unknown as { commission_catalog_media: unknown }).commission_catalog_media = {
      alt: { en: "Updated Chibi cover", th: "ภาพปกชิบิที่อัปเดต" },
      content_type: "image/webp",
      height: 1200,
      id: serviceMediaId,
      width: 1200,
    };
    const query = queryResult([row]);
    supabase.createClient.mockResolvedValue({ from: vi.fn(() => query) });

    const catalog = await listPublicAlbums("th");

    expect(catalog.types[0].examples).toEqual([{
      crop: { aspectRatio: "1 / 1", objectPosition: "50% 50%" },
      id: serviceMediaId,
      media: expect.objectContaining({
        cardSrc: `/api/catalog/media/${serviceMediaId}`,
        detailSrc: `/api/catalog/media/${serviceMediaId}`,
        thumbnailSrc: `/api/catalog/media/${serviceMediaId}`,
      }),
      title: { en: "Chibi Full Body", th: "Chibi Full Body" },
    }]);
  });

  it("loads one published album and returns null for a missing slug", async () => {
    const foundQuery = queryResult([albumRow()]);
    supabase.createClient.mockResolvedValueOnce({ from: vi.fn(() => foundQuery) });
    const result = await getPublicAlbum("en", "chibi");
    expect(foundQuery.eq).toHaveBeenCalledWith("slug", "chibi");
    expect(result?.category.name.en).toBe("Chibi");

    const missingQuery = queryResult([]);
    supabase.createClient.mockResolvedValueOnce({ from: vi.fn(() => missingQuery) });
    await expect(getPublicAlbum("th", "missing")).resolves.toBeNull();
  });

  it("fails closed when Supabase returns malformed catalog data", async () => {
    const query = queryResult([{ id: "unsafe" }]);
    supabase.createClient.mockResolvedValue({ from: vi.fn(() => query) });
    await expect(listPublicAlbums("th")).rejects.toThrow("Public catalog data is unavailable");
  });

  it("keeps a newly published child service hidden until it has a reference price", async () => {
    const row = albumRow();
    const service = row.commission_services[0];
    service.commission_service_prices = [];
    const query = queryResult([row]);
    supabase.createClient.mockResolvedValue({ from: vi.fn(() => query) });

    const result = await listPublicAlbums("th");

    expect(result.categories[0].typeCount).toBe(0);
    expect(result.types).toEqual([]);
  });
});

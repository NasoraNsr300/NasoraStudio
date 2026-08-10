import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const catalog = vi.hoisted(() => ({
  getPublicAlbum: vi.fn(),
  listPublicAlbums: vi.fn(),
}));

vi.mock("@/features/catalog/data/public-catalog-repository.server", () => catalog);
vi.mock("@/features/commission/components/commission-albums-page", () => ({
  CommissionAlbumsPage: () => <div>album fallback</div>,
}));
vi.mock("@/features/commission/components/commission-search", () => ({
  CommissionSearch: ({ categories }: { categories: Array<{ slug: string }> }) => <div>live albums: {categories.map((item) => item.slug).join(",")}</div>,
}));
vi.mock("@/features/commission/components/service-category-page", () => ({
  ServiceCategoryPage: ({ category, services }: { category: { slug: string }; services: Array<{ slug: string }> }) => <div>live album: {category.slug}/{services.map((item) => item.slug).join(",")}</div>,
}));

import CommissionRoute from "@/app/[locale]/commission/page";
import CommissionCategoryRoute from "@/app/[locale]/commission/[category]/page";

const category = {
  availability: "open" as const,
  description: { en: "Cute", th: "น่ารัก" },
  name: { en: "Chibi", th: "ชิบิ" },
  published: true,
  recommended: false,
  slug: "chibi",
};

const service = {
  availability: "open" as const,
  categorySlug: "chibi",
  description: { en: "Bust", th: "ครึ่งตัว" },
  documentSlugs: [],
  examples: [],
  freeRevisionCount: 4,
  modifiers: [],
  name: { en: "Bust", th: "ครึ่งตัว" },
  published: true,
  referencePrices: [{ amountThb: 900, label: { en: "Personal", th: "ส่วนตัว" }, pace: "normal" as const, usage: "personal" as const }],
  slug: "bust",
  timingGuidance: { en: "7 days", th: "7 วัน" },
};

describe("public commission catalog routes", () => {
  it("loads the album index from the live catalog repository", async () => {
    catalog.listPublicAlbums.mockResolvedValue({ categories: [category], types: [service] });
    render(await CommissionRoute({ params: Promise.resolve({ locale: "th" }) }));
    expect(catalog.listPublicAlbums).toHaveBeenCalledWith("th");
    expect(screen.getByText("live albums: chibi")).toBeVisible();
  });

  it("loads an album and its child services from the live catalog repository", async () => {
    catalog.getPublicAlbum.mockResolvedValue({ category, types: [service] });
    render(await CommissionCategoryRoute({ params: Promise.resolve({ category: "chibi", locale: "th" }) }));
    expect(catalog.getPublicAlbum).toHaveBeenCalledWith("th", "chibi");
    expect(screen.getByText("live album: chibi/bust")).toBeVisible();
  });
});

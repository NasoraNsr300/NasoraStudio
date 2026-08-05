import { describe, expect, it } from "vitest";

import { fixturePublicContentRepository } from "@/data/fixture-public-content-repository";

describe("fixture public content repository", () => {
  it("returns an enabled Home hero pool and display-ordered featured work", async () => {
    const home = await fixturePublicContentRepository.getHome("th");

    expect(home.hero.filter((item) => item.enabled).length).toBeGreaterThanOrEqual(2);
    expect(home.featured.map((item) => item.displayOrder)).toEqual(
      [...home.featured.map((item) => item.displayOrder)].sort((a, b) => a - b),
    );
  });

  it("returns the five initial commission service categories", async () => {
    const categories = await fixturePublicContentRepository.getServiceCategories("th");

    expect(categories.map((category) => category.slug)).toEqual([
      "chibi",
      "illustration",
      "vtuber",
      "minecraft-skin",
      "minecraft-3d-model",
    ]);
  });

  it("exposes only safe public queue fields", async () => {
    const queue = await fixturePublicContentRepository.getQueue("en");

    expect(queue).not.toHaveLength(0);
    expect(Object.keys(queue[0] ?? {})).toEqual([
      "displayName",
      "status",
      "serviceType",
      "deadline",
    ]);
  });

  it("returns published documents only", async () => {
    const documents = await fixturePublicContentRepository.getDocuments("en");

    expect(documents).not.toHaveLength(0);
    expect(documents.every((document) => document.published)).toBe(true);
  });
});

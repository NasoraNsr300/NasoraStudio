import { describe, expect, it } from "vitest";

import {
  fixturePublicContentRepository,
  projectPublicQueueItem,
} from "@/data/fixture-public-content-repository";
import { privateQueueFixtureRecords } from "@/data/fixtures/private-queue-fixtures.server";
import type { PublicQueueItem } from "@/shared/types/public-content";
import { serviceCategories } from "@/data/fixtures/public-content";

const privateQueueRecord = {
  position: 1,
  displayName: "Private source",
  serviceName: "Illustration",
  statusLabel: "Sketching",
  deadlineLabel: "18 Aug 2026",
  quoteId: "quote-private",
  paymentId: "payment-private",
  messageId: "message-private",
  contact: "private@example.com",
  deliveryUrl: "https://private.example/delivery",
};

// @ts-expect-error Public queue rows reject approved private record categories.
const unsafePublicQueueAssignment: PublicQueueItem = privateQueueRecord;
void unsafePublicQueueAssignment;

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

  it("exposes only published service categories and types", async () => {
    const categories = await fixturePublicContentRepository.getServiceCategories("en");
    const unpublished = serviceCategories.find((category) => category.slug === "draft-private");

    expect(unpublished).toMatchObject({ published: false });
    expect(categories.every((category) => category.published)).toBe(true);
    expect(categories.map((category) => category.slug)).not.toContain("draft-private");
    expect(await fixturePublicContentRepository.getServiceCategory("en", "draft-private")).toBeNull();
  });

  it("projects private fixture records to the downstream public queue contract", async () => {
    const queue = await fixturePublicContentRepository.getQueue("en");
    const projected = projectPublicQueueItem(privateQueueFixtureRecords[0], "en");

    expect(queue).not.toHaveLength(0);
    expect(Object.keys(queue[0] ?? {})).toEqual([
      "position",
      "displayName",
      "serviceName",
      "statusLabel",
      "deadlineLabel",
    ]);
    expect(projected).toEqual(queue[0]);
    expect(projected).not.toHaveProperty("quoteId");
    expect(projected).not.toHaveProperty("paymentId");
    expect(projected).not.toHaveProperty("messageId");
    expect(projected).not.toHaveProperty("contact");
    expect(projected).not.toHaveProperty("deliveryUrl");
  });

  it("returns published documents only", async () => {
    const documents = await fixturePublicContentRepository.getDocuments("en");

    expect(documents).not.toHaveLength(0);
    expect(documents.every((document) => document.published)).toBe(true);
  });

  it("serves stored WebP derivatives and omits unavailable published video assets", async () => {
    const portfolio = await fixturePublicContentRepository.getPortfolio("en");

    expect(portfolio).not.toHaveLength(0);
    expect(portfolio.every((item) => item.media.kind === "image")).toBe(true);
    for (const item of portfolio) {
      expect(item.media.thumbnailSrc).toMatch(/-thumbnail\.webp$/);
      expect(item.media.cardSrc).toMatch(/-card\.webp$/);
      expect(item.media.detailSrc).toMatch(/-detail\.webp$/);
    }
  });
});

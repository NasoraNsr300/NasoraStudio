import { describe, expect, it } from "vitest";

import { portfolioTileWidth } from "@/features/portfolio/components/portfolio-layout";

describe("portfolioTileWidth", () => {
  it("keeps portrait and near-square media in one column", () => {
    expect(portfolioTileWidth({ height: 1600, id: "00000000-0000-4000-8000-000000000001", width: 1200 })).toBe("single");
    expect(portfolioTileWidth({ height: 1200, id: "00000000-0000-4000-8000-000000000003", width: 1200 })).toBe("single");
  });

  it("uses a deterministic span for landscape media", () => {
    const media = { height: 800, id: "00000000-0000-4000-8000-000000000002", width: 1800 };
    expect(portfolioTileWidth(media)).toBe("double");
    expect(portfolioTileWidth(media)).toBe(portfolioTileWidth(media));
  });
});

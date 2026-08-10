import { describe, expect, it } from "vitest";

import { portfolioTileShape } from "@/features/portfolio/components/portfolio-layout";

describe("portfolioTileShape", () => {
  it("returns a stable masonry span from id and image ratio", () => {
    const first = portfolioTileShape({ height: 1600, id: "00000000-0000-4000-8000-000000000001", width: 1200 });
    expect(portfolioTileShape({ height: 1600, id: "00000000-0000-4000-8000-000000000001", width: 1200 })).toEqual(first);
    expect(first).toMatch(/^(portrait|square|wide|hero)$/);
  });

  it("uses wide spans for landscape media and never leaves an undefined shape", () => {
    expect(["wide", "hero"]).toContain(portfolioTileShape({ height: 800, id: "00000000-0000-4000-8000-000000000002", width: 1800 }));
  });
});

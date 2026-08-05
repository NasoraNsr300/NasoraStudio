import { describe, expect, it } from "vitest";

import { heroItems } from "@/data/fixtures/public-content";
import { selectHero } from "@/features/home/lib/select-hero";

describe("selectHero", () => {
  it("rejects an empty enabled hero collection", () => {
    expect(() => selectHero([], 0)).toThrow("at least one enabled hero");
  });

  it("selects deterministically from an injected random value", () => {
    expect(selectHero(heroItems, 0).id).toBe("hero-moonlit");
    expect(selectHero(heroItems, 0.75).id).toBe("hero-amber");
  });

  it("ignores disabled heroes", () => {
    expect(selectHero([{ ...heroItems[0], enabled: false }, heroItems[1]], 0).id).toBe("hero-amber");
  });
});

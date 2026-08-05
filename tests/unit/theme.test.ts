import { describe, expect, it } from "vitest";

import { isLocale } from "@/shared/i18n/locales";
import { resolveAutomaticTheme } from "@/shared/theme/theme";

describe("theme resolution", () => {
  it("uses night after 18:00", () => {
    expect(resolveAutomaticTheme(21)).toBe("night");
  });

  it("uses autumn during daytime", () => {
    expect(resolveAutomaticTheme(11)).toBe("autumn");
  });
});

describe("locale validation", () => {
  it("accepts only supported locale segments", () => {
    expect(isLocale("th")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("jp")).toBe(false);
  });
});

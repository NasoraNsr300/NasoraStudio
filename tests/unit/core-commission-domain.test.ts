import { describe, expect, it } from "vitest";

import {
  depositPercentSchema,
  moneySatangSchema,
  quoteStatusSchema,
  requestStatusSchema,
} from "@/features/commission/domain/core-commission";

describe("core commission domain", () => {
  it("accepts the persisted request and quote lifecycles", () => {
    expect(requestStatusSchema.parse("submitted")).toBe("submitted");
    expect(requestStatusSchema.parse("converted")).toBe("converted");
    expect(quoteStatusSchema.parse("draft")).toBe("draft");
    expect(quoteStatusSchema.parse("superseded")).toBe("superseded");
  });

  it("stores non-negative integer satang and a valid deposit percent", () => {
    expect(moneySatangSchema.parse(650_000)).toBe(650_000);
    expect(() => moneySatangSchema.parse(10.5)).toThrow();
    expect(() => moneySatangSchema.parse(-1)).toThrow();
    expect(depositPercentSchema.parse(50)).toBe(50);
    expect(() => depositPercentSchema.parse(101)).toThrow();
  });
});

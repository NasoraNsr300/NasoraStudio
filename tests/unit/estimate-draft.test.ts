import { describe, expect, it } from "vitest";
import { parseEstimateDraft } from "@/features/commission/domain/estimate-draft";

const valid = {
  version: 1 as const, usageType: "personal", budgetKind: "range", budgetMinThb: "1000", budgetMaxThb: "2000",
  requestedDeadline: "2099-09-01", description: "Character brief", moodAndStyle: "Night", extraCharacterCount: 1,
  backgroundLevel: 0, propCount: 2, guestDisplayName: "Moon", guestContactKind: "discord", guestContactValue: "@moon",
  savedAt: "2026-08-14T00:00:00.000Z",
};

describe("estimate draft", () => {
  it("accepts the supported bounded version", () => expect(parseEstimateDraft(valid)).toEqual(valid));
  it("rejects obsolete, unknown, invalid, and oversized payloads", () => {
    expect(() => parseEstimateDraft({ ...valid, version: 2 })).toThrow();
    expect(() => parseEstimateDraft({ ...valid, extra: true })).toThrow();
    expect(() => parseEstimateDraft({ ...valid, extraCharacterCount: 21 })).toThrow();
    expect(() => parseEstimateDraft({ ...valid, description: "x".repeat(1001) })).toThrow();
  });
});

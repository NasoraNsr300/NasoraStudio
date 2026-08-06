import { describe, expect, it } from "vitest";

import { getDictionary } from "@/shared/i18n/dictionaries";

describe("commission messages", () => {
  it("uses the approved Thai CTA labels", () => {
    expect(getDictionary("th").commission).toMatchObject({
      estimate: "ประเมินราคา",
      detailsAndRates: "ดูรายละเอียดและเรทราคา",
    });
  });

  it("uses the approved English CTA labels", () => {
    expect(getDictionary("en").commission).toMatchObject({
      estimate: "Request Estimate",
      detailsAndRates: "View Details & Rates",
    });
  });
});

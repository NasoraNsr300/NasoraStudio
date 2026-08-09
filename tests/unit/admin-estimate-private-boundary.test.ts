import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("admin estimate private-detail boundary", () => {
  it("keeps the contact-bearing detail server-rendered and out of the inbox client props", () => {
    const detail = readFileSync("src/features/admin/estimates/components/admin-estimate-detail.tsx", "utf8");
    const inbox = readFileSync("src/features/admin/estimates/components/admin-estimate-inbox.tsx", "utf8");

    expect(detail.trimStart()).not.toMatch(/^['\"]use client['\"]/);
    expect(detail).toContain("AdminEstimateStatusControls");
    expect(inbox).not.toContain("AdminEstimateDetail");
    expect(inbox).not.toContain("detail?:");
  });
});

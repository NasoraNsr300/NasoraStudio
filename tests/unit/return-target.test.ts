import { describe, expect, it } from "vitest";

import { safeMemberReturnTarget } from "@/shared/auth/return-target";

describe("safeMemberReturnTarget", () => {
  it("accepts a localized member path", () => {
    expect(safeMemberReturnTarget("/th/member/profile", "th")).toBe("/th/member/profile");
  });

  it("rejects external and protocol-relative redirects", () => {
    expect(safeMemberReturnTarget("https://attacker.example", "th")).toBe("/th/member/requests");
    expect(safeMemberReturnTarget("//attacker.example", "en")).toBe("/en/member/requests");
  });

  it("rejects paths outside the active locale member area", () => {
    expect(safeMemberReturnTarget("/en/member/profile", "th")).toBe("/th/member/requests");
    expect(safeMemberReturnTarget("/th/portfolio", "th")).toBe("/th/member/requests");
  });
});

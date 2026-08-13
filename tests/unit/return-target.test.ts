import { describe, expect, it } from "vitest";

import { safeAppReturnTarget, safeMemberReturnTarget } from "@/shared/auth/return-target";

describe("safeAppReturnTarget", () => {
  it("accepts localized public and member paths with query and hash", () => {
    expect(safeAppReturnTarget("/th/portfolio?tag=chibi#latest", "th")).toBe("/th/portfolio?tag=chibi#latest");
    expect(safeAppReturnTarget("/en/member/profile", "en")).toBe("/en/member/profile");
  });

  it("rejects protocols, protocol-relative URLs, foreign origins, and locale mismatches", () => {
    expect(safeAppReturnTarget("https://attacker.example/th", "th")).toBe("/th");
    expect(safeAppReturnTarget("//attacker.example/th", "th")).toBe("/th");
    expect(safeAppReturnTarget("javascript:alert(1)", "th")).toBe("/th");
    expect(safeAppReturnTarget("/en/portfolio", "th")).toBe("/th");
  });
});

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

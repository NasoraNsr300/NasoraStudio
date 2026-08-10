import { describe, expect, it } from "vitest";

import { memberAccessDecision } from "@/shared/auth/return-target";

describe("memberAccessDecision", () => {
  it("redirects signed-out visitors back to authentication", () => {
    expect(memberAccessDecision(null, "th", "/th/member/profile")).toEqual({
      allowed: false,
      redirectTo: "/th?auth=1&next=%2Fth%2Fmember%2Fprofile",
    });
  });

  it("allows a server-verified user", () => {
    expect(memberAccessDecision({ id: "user-1" }, "th", "/th/member/profile")).toEqual({ allowed: true });
  });

  it("normalizes an untrusted path before including it in the redirect", () => {
    expect(memberAccessDecision(null, "en", "https://attacker.example")).toEqual({
      allowed: false,
      redirectTo: "/en?auth=1&next=%2Fen%2Fmember%2Frequests",
    });
  });
});

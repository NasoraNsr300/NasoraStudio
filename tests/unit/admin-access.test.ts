import { describe, expect, it } from "vitest";

import { isNasoraAdmin } from "@/shared/auth/admin-access";

describe("isNasoraAdmin", () => {
  it("allows only the configured email with an immutable admin role", () => {
    expect(isNasoraAdmin({
      app_metadata: { role: "admin" },
      email: "nasora.nsr300@gmail.com",
    })).toBe(true);

    expect(isNasoraAdmin({
      app_metadata: { role: "member" },
      email: "nasora.nsr300@gmail.com",
    })).toBe(false);
    expect(isNasoraAdmin({
      app_metadata: { role: "admin" },
      email: "someone@example.com",
    })).toBe(false);
    expect(isNasoraAdmin({
      app_metadata: {},
      email: "nasora.nsr300@gmail.com",
      user_metadata: { role: "admin" },
    })).toBe(false);
  });
});

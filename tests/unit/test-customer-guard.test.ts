import { describe, expect, it } from "vitest";

import {
  APPROVED_TEST_CUSTOMER_EMAIL,
  assertTestResetAllowed,
  parseTestCustomerEnv,
} from "@/features/test-support/test-customer";

describe("ordinary test customer reset guard", () => {
  it("refuses every production reset", () => {
    expect(() => assertTestResetAllowed({ email: APPROVED_TEST_CUSTOMER_EMAIL, nodeEnv: "production" }))
      .toThrow("disabled in production");
  });

  it("allows only the one approved ordinary-customer email", () => {
    expect(() => assertTestResetAllowed({ email: "other@nasora.local", nodeEnv: "development" }))
      .toThrow(APPROVED_TEST_CUSTOMER_EMAIL);
    expect(() => assertTestResetAllowed({ email: APPROVED_TEST_CUSTOMER_EMAIL, nodeEnv: "test" }))
      .not.toThrow();
  });

  it("requires server-only credentials and a strong password", () => {
    expect(() => parseTestCustomerEnv({})).toThrow("TEST_CUSTOMER_PASSWORD");
    expect(() => parseTestCustomerEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SECRET_KEY: "secret",
      TEST_CUSTOMER_EMAIL: APPROVED_TEST_CUSTOMER_EMAIL,
      TEST_CUSTOMER_PASSWORD: "short",
    })).toThrow("at least 12 characters");
  });

  it("returns normalized environment values without weakening the member role", () => {
    expect(parseTestCustomerEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co/",
      NODE_ENV: "development",
      SUPABASE_SECRET_KEY: "secret-key",
      TEST_CUSTOMER_EMAIL: " CUSTOMER.TEST@NASORA.LOCAL ",
      TEST_CUSTOMER_PASSWORD: "ordinary-test-password",
    })).toEqual({
      email: APPROVED_TEST_CUSTOMER_EMAIL,
      password: "ordinary-test-password",
      secretKey: "secret-key",
      supabaseUrl: "https://example.supabase.co",
    });
  });
});

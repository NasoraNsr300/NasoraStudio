import { describe, expect, it } from "vitest";

import { readSupabasePublicEnv } from "@/shared/supabase/env";

describe("readSupabasePublicEnv", () => {
  it("returns the configured public Supabase connection", () => {
    expect(readSupabasePublicEnv({
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
    })).toEqual({
      publishableKey: "sb_publishable_test",
      url: "https://project-ref.supabase.co",
    });
  });

  it("fails clearly when the public connection is incomplete", () => {
    expect(() => readSupabasePublicEnv({
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
    })).toThrow("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  });
});

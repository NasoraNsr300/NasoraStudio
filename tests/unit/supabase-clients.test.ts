import { describe, expect, it } from "vitest";

import { createSupabaseBrowserClient } from "@/shared/supabase/client";
import { createSupabaseServerClient } from "@/shared/supabase/server";

const environment = {
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
};

describe("Supabase clients", () => {
  it("creates a browser client from the public connection", () => {
    const client = createSupabaseBrowserClient(environment);

    expect(client.auth).toBeDefined();
    expect(client.from).toBeTypeOf("function");
  });

  it("creates a server client backed by the supplied cookie store", () => {
    const cookieStore = {
      getAll: () => [],
      set: () => undefined,
    };

    const client = createSupabaseServerClient(cookieStore, environment);

    expect(client.auth).toBeDefined();
    expect(client.from).toBeTypeOf("function");
  });
});

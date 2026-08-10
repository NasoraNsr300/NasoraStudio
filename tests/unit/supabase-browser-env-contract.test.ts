import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Supabase browser environment contract", () => {
  it("references each public variable directly so Next.js can inline it", () => {
    const source = readFileSync("src/shared/supabase/client.ts", "utf8");
    expect(source).toContain("process.env.NEXT_PUBLIC_SUPABASE_URL");
    expect(source).toContain("process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  });
});

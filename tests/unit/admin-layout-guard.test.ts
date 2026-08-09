import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("admin layout boundary", () => {
  it("checks the authenticated user on the server before rendering the admin shell", () => {
    const source = readFileSync("src/app/(admin)/layout.tsx", "utf8");

    expect(source).toContain("createClient");
    expect(source).toContain("isNasoraAdmin");
    expect(source).toContain("redirect(");
  });
});

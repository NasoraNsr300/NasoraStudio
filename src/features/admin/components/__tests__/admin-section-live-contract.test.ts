import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/features/admin/components/admin-section-pages.tsx"), "utf8");

describe("admin section live contract", () => {
  it("contains no legacy customer or invoice fixtures", () => {
    for (const fixture of ["Kirana", "ShiroNeko", "Mildred", "Tanmayo", "INV-240524-001"]) {
      expect(source).not.toContain(fixture);
    }
  });

  it("does not render an inert primary action", () => {
    expect(source).not.toContain("function PageHeader");
    expect(source).not.toContain("primaryAction");
  });
});

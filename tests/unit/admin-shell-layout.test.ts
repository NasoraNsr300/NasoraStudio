import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const css = readFileSync("src/features/admin/components/admin-dashboard.module.css", "utf8")
  .replace(/\s+/g, " ");

describe("admin shell content width", () => {
  it("uses the full workspace for section pages and reserves the right rail for the dashboard only", () => {
    expect(css).toMatch(/\.main \{[^}]*grid-template-columns: minmax\(0, 1fr\);/);
    expect(css).toMatch(/\.dashboardShell \.main \{[^}]*grid-template-columns: minmax\(0, 1fr\) 260px;/);
  });
});

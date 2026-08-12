import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/features/admin/components/admin-dashboard.module.css"), "utf8");

describe("admin dashboard queue layout", () => {
  it("keeps a single job in one compact table row", () => {
    expect(css).not.toMatch(/\.dashboardShell\s+\.queueTable\s*\{[^}]*height:/);
    expect(css).not.toMatch(/\.queueTable\s+td:nth-child\(2\)\s*\{[^}]*display:\s*flex/);
    expect(css).toMatch(/\.queueTable\s+\.avatarMini\s*\{[^}]*vertical-align:\s*middle/);
  });
});

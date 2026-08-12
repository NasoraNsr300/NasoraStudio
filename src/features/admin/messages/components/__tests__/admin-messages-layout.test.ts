import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/features/admin/messages/components/admin-messages-workspace.module.css"), "utf8");

describe("admin messages layout", () => {
  it("keeps the workspace inside the viewport and scrolls only message history", () => {
    expect(css).toMatch(/\.page\s*\{[^}]*height:\s*calc\(100dvh\s*-\s*92px\)/);
    expect(css).toMatch(/\.page\s*\{[^}]*grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\)/);
    expect(css).toMatch(/\.thread\s*\{[^}]*grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\)\s+auto/);
    expect(css).toMatch(/\.messages\s*\{[^}]*min-height:\s*0[^}]*overflow(?:-y)?:\s*auto/);
  });
});

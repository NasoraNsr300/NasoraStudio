import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const modalCss = readFileSync("src/features/admin/modal/admin-modal-shell.module.css", "utf8");
const catalogCss = readFileSync("src/features/admin/catalog/components/admin-album-editor.module.css", "utf8");

describe("Admin modal scrolling", () => {
  it("keeps one themed scrollbar on modal content instead of nesting form scrolling", () => {
    expect(modalCss).toMatch(/\.panel\s*\{[^}]*display:\s*grid[^}]*grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\)[^}]*overflow:\s*hidden/i);
    expect(modalCss).toMatch(/\.content\s*\{[^}]*overflow-y:\s*auto/i);
    expect(modalCss).toMatch(/\.content\s*\{[^}]*scrollbar-color:\s*[^;]+/i);
    expect(catalogCss).not.toMatch(/\.serviceEditor\s*\{[^}]*overflow-y:\s*auto/i);
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/features/member/components/member-pages.module.css"), "utf8");

describe("member area layout", () => {
  it("keeps every member page inside the viewport and scrolls its content panel", () => {
    expect(css).toMatch(/\.memberArea\s*\{[^}]*height:\s*calc\(100dvh\s*-\s*104px\)[^}]*overflow:\s*hidden/);
    expect(css).toMatch(/\.memberArea\s*>\s*\*\s*\{[^}]*height:\s*100%[^}]*min-height:\s*0/);
    expect(css).toMatch(/\.memberArea\s*>\s*\.pagePanel\s*\{[^}]*overflow-y:\s*auto[^}]*overscroll-behavior:\s*contain/);
    expect(css).toMatch(/\.memberArea\s*>\s*\.pagePanel\s*\{[^}]*scrollbar-gutter:\s*stable/);
    expect(css).toMatch(/\.memberArea\s*>\s*\.messagePanel\s*\{[^}]*overflow:\s*hidden/);
  });
});

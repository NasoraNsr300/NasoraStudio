import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/features/member/components/member-pages.module.css"), "utf8");

describe("member messages layout", () => {
  it("locks the message panel to the viewport and scrolls both lists internally", () => {
    expect(css).toMatch(/\.messagePanel\s*\{[^}]*height:\s*calc\(100dvh\s*-\s*8\.5rem\)/);
    expect(css).toMatch(/\.messagePanel\s*\{[^}]*grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\)/);
    expect(css).toMatch(/\.messagesLayout\s*\{[^}]*height:\s*100%[^}]*min-height:\s*0/);
    expect(css).toMatch(/\.conversationList\s*\{[^}]*overflow-y:\s*auto/);
    expect(css).toMatch(/\.chatBody\s*\{[^}]*min-height:\s*0[^}]*overflow-y:\s*auto/);
    expect(css).toMatch(/\.chatBody\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column/);
    expect(css).not.toMatch(/\.chatBody\s*\{[^}]*align-content:\s*end/);
    expect(css).toMatch(/\.chatBody\s*>\s*\.bubble:first-child\s*\{[^}]*margin-top:\s*auto/);
  });
});

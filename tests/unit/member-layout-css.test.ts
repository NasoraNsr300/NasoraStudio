import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const pagesCss = readFileSync("src/features/member/components/member-pages.module.css", "utf8");
const jobCss = readFileSync("src/features/member/components/member.module.css", "utf8");

describe("member workspace layout", () => {
  it("keeps job rows to three content columns and the action compact", () => {
    expect(pagesCss).toMatch(/\.jobRow\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s+auto/i);
    expect(pagesCss).toMatch(/\.rowButton\s*\{[^}]*display:\s*inline-flex[^}]*justify-self:\s*end/i);
  });

  it("right-aligns the payment action instead of stretching it across the card", () => {
    expect(pagesCss).toMatch(/\.paymentActions\s*\{[^}]*display:\s*flex[^}]*justify-content:\s*flex-end/i);
  });

  it("uses equal horizontal padding for every payment summary column", () => {
    expect(pagesCss).toMatch(/\.moneyGrid div\s*\{[^}]*padding:\s*\.3rem 1rem/i);
    expect(pagesCss).not.toMatch(/\.moneyGrid div:first-child\s*\{[^}]*padding-left:\s*0/i);
  });

  it("lays out timeline dates without negative translation overlap", () => {
    expect(jobCss).toMatch(/\.timeline article\s*\{[^}]*grid-template-columns:\s*7rem\s+1\.8rem\s+minmax\(0,\s*1fr\)/i);
    expect(jobCss).not.toMatch(/\.timeline article\s*\{[^}]*transform:\s*translateX/i);
  });
});

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const css = fs.readFileSync(path.join(process.cwd(), "src/shared/components/public-shell/public-shell.module.css"), "utf8");

describe("public navbar availability colors", () => {
  it("uses an explicit red treatment when commissions are closed", () => {
    expect(css).toMatch(/\.availability\[data-state="closed"\][^{]*\{[^}]*color:\s*var\(--danger\)/);
    expect(css).toMatch(/\.availability\[data-state="closed"\][^{]*\.statusDot[^}]*\{[^}]*background:\s*var\(--danger\)/);
  });
});

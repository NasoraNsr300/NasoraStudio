import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const css = fs.readFileSync(path.join(process.cwd(), "src/features/portfolio/components/portfolio.module.css"), "utf8");

describe("portfolio masonry CSS", () => {
  it("uses intrinsic card ratios without fixed rows or cropped media", () => {
    expect(css).not.toMatch(/object-fit:\s*cover/);
    expect(css).not.toMatch(/grid-auto-rows:/);
    expect(css).toMatch(/\.card\s*\{[\s\S]*?aspect-ratio:\s*var\(--portfolio-aspect-ratio\)/);
  });
});

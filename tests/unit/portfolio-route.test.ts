import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import * as portfolioRouteModule from "@/app/[locale]/portfolio/page";

describe("PortfolioRoute", () => {
  it("pre-renders both locales without consuming dynamic search params on the server", () => {
    const source = readFileSync(join(process.cwd(), "src/app/[locale]/portfolio/page.tsx"), "utf8");

    expect(portfolioRouteModule.generateStaticParams()).toEqual([{ locale: "th" }, { locale: "en" }]);
    expect(portfolioRouteModule).not.toHaveProperty("dynamic");
    expect(source).not.toContain("searchParams");
  });
});

import { describe, expect, it } from "vitest";

import HomeRoute, * as homeRouteModule from "@/app/[locale]/page";

describe("HomeRoute", () => {
  it("remains static-cacheable and does not pass server randomness to Home", async () => {
    expect(homeRouteModule).not.toHaveProperty("dynamic");
    expect(homeRouteModule.generateStaticParams()).toEqual([{ locale: "th" }, { locale: "en" }]);

    const page = await HomeRoute({ params: Promise.resolve({ locale: "en" }) });

    expect(page).not.toBeNull();
    if (!page) throw new Error("Expected the English Home route to render");
    expect(page.props).not.toHaveProperty("randomValue");
  });
});

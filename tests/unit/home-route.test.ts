import { describe, expect, it, vi } from "vitest";

const liveHome = vi.hoisted(() => ({ getLiveHomeContent: vi.fn() }));
vi.mock("@/features/home/data/live-home-repository.server", () => liveHome);

import HomeRoute, * as homeRouteModule from "@/app/[locale]/page";

describe("HomeRoute", () => {
  it("remains static-cacheable and does not pass server randomness to Home", async () => {
    liveHome.getLiveHomeContent.mockResolvedValue({ featured: [], hero: [], settings: {
      businessHours: "11:00 – 22:00", commissionsOpen: true, discordContact: "nasora.studio",
      homeDescription: { en: "Stories", th: "เรื่องราว" }, homeHeading: { en: "Draw", th: "วาด" },
      particlesEnabled: true, queueCapacity: 10, shootingStarsEnabled: true,
    } });
    expect(homeRouteModule).not.toHaveProperty("dynamic");
    expect(homeRouteModule.generateStaticParams()).toEqual([{ locale: "th" }, { locale: "en" }]);

    const page = await HomeRoute({ params: Promise.resolve({ locale: "en" }) });

    expect(page).not.toBeNull();
    if (!page) throw new Error("Expected the English Home route to render");
    expect(page.props).not.toHaveProperty("randomValue");
    expect(liveHome.getLiveHomeContent).toHaveBeenCalledWith("en");
  });
});

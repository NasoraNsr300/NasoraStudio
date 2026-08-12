import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AboutPage } from "@/features/about/components/about-page";

const settings = {
  aboutBiography: { en: "Live biography", th: "ประวัติจริง" },
  aboutContact: { en: "Live contact copy", th: "ข้อความติดต่อจริง" },
  businessHours: "11:00 – 22:00",
  commissionsOpen: true,
  contactEmail: "nasora.nsr300@gmail.com",
  discordContact: "nasora.studio",
  homeDescription: { en: "Stories", th: "เรื่องราว" },
  homeHeading: { en: "Draw", th: "วาด" },
  instagramUrl: "",
  particlesEnabled: true,
  queueCapacity: 10,
  shootingStarsEnabled: true,
};

describe("AboutPage", () => {
  it("renders Admin-managed copy and real configured channels", () => {
    render(<AboutPage locale="en" settings={settings} />);
    expect(screen.getByText("Live biography")).toBeVisible();
    expect(screen.getByText("Live contact copy")).toBeVisible();
    expect(screen.getByRole("link", { name: "Email" })).toHaveAttribute("href", "mailto:nasora.nsr300@gmail.com");
    expect(screen.queryByRole("link", { name: "Instagram" })).not.toBeInTheDocument();
  });
});

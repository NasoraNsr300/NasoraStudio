import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { featuredItems } from "@/data/fixtures/public-content";
import { FeaturedCarousel } from "@/features/home/components/featured-carousel";

const items = [
  ...featuredItems,
  { ...featuredItems[0], id: "featured-repeat-a", title: { th: "แสงดาว", en: "Starlight Study" } },
  { ...featuredItems[1], id: "featured-repeat-b", title: { th: "ป่าค่ำ", en: "Forest Evening" } },
];

afterEach(() => {
  cleanup();
});

describe("FeaturedCarousel continuous loop", () => {
  it("renders two groups for a seamless loop while exposing only the primary group", () => {
    render(<FeaturedCarousel items={items} locale="en" />);

    expect(screen.getAllByTestId("featured-loop-group")).toHaveLength(2);
    expect(screen.getByTestId("featured-loop-viewport")).toHaveAttribute("data-visible-count", "4");
    expect(screen.getAllByRole("link", { name: "View Starlit Traveler" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Next featured work" })).not.toBeInTheDocument();
  });

  it("keeps the artwork loop continuous without manual motion controls", () => {
    render(<FeaturedCarousel items={items} locale="en" />);
    const track = screen.getByTestId("featured-loop-track");

    expect(track).not.toHaveAttribute("data-paused");
    expect(screen.queryByRole("button", { name: /pause featured artwork|play featured artwork/i })).not.toBeInTheDocument();
  });

  it("pads a short source to four visible presentation cards without changing the source", () => {
    const shortItems = featuredItems.slice(0, 2);
    render(<FeaturedCarousel items={shortItems} locale="en" />);

    const primary = screen.getAllByTestId("featured-loop-group")[0];
    expect(primary.querySelectorAll("a")).toHaveLength(4);
    expect(shortItems).toHaveLength(2);
  });

  it("renders nothing when no featured work is published", () => {
    const { container } = render(<FeaturedCarousel items={[]} locale="en" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("localizes the region and destinations", () => {
    render(<FeaturedCarousel items={items} locale="th" />);

    expect(screen.getByRole("region", { name: "ผลงานแนะนำ" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "หยุดผลงานเด่น" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ดู Starlit Traveler" })).toHaveAttribute(
      "href",
      "/th/portfolio?work=starlit-traveler",
    );
  });
});

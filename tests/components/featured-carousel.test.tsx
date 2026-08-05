import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { featuredItems } from "@/data/fixtures/public-content";
import { FeaturedCarousel } from "@/features/home/components/featured-carousel";

const items = [
  ...featuredItems,
  { ...featuredItems[0], id: "featured-repeat-a", title: { th: "แสงดาว", en: "Starlight Study" } },
  { ...featuredItems[1], id: "featured-repeat-b", title: { th: "ป่าค่ำ", en: "Forest Evening" } },
];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("FeaturedCarousel continuous loop", () => {
  it("renders two groups for a seamless loop while exposing only the primary group", () => {
    render(<FeaturedCarousel items={items} locale="en" />);

    expect(screen.getAllByTestId("featured-loop-group")).toHaveLength(2);
    expect(screen.getByTestId("featured-loop-viewport")).toHaveAttribute("data-visible-count", "4");
    expect(screen.getAllByRole("link", { name: "View Starlit Traveler" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Next featured work" })).not.toBeInTheDocument();
  });

  it("toggles an explicit manual pause", () => {
    render(<FeaturedCarousel items={items} locale="en" />);
    const track = screen.getByTestId("featured-loop-track");

    fireEvent.click(screen.getByRole("button", { name: "Pause featured artwork" }));
    expect(track).toHaveAttribute("data-paused", "true");
    fireEvent.click(screen.getByRole("button", { name: "Play featured artwork" }));
    expect(track).toHaveAttribute("data-paused", "false");
  });

  it("pauses while hovered and resumes after the pointer leaves", () => {
    render(<FeaturedCarousel items={items} locale="en" />);
    const carousel = screen.getByRole("region", { name: "Featured work" });
    const track = screen.getByTestId("featured-loop-track");

    fireEvent.pointerEnter(carousel);
    expect(track).toHaveAttribute("data-paused", "true");
    fireEvent.pointerLeave(carousel);
    expect(track).toHaveAttribute("data-paused", "false");
  });

  it("pauses while focus is within and resumes after focus leaves", () => {
    render(<FeaturedCarousel items={items} locale="en" />);
    const carousel = screen.getByRole("region", { name: "Featured work" });
    const track = screen.getByTestId("featured-loop-track");
    const pause = screen.getByRole("button", { name: "Pause featured artwork" });

    fireEvent.focusIn(pause);
    expect(track).toHaveAttribute("data-paused", "true");
    fireEvent.focusOut(carousel, { relatedTarget: document.body });
    expect(track).toHaveAttribute("data-paused", "false");
  });

  it("pauses while the document is hidden and resumes when visible", () => {
    render(<FeaturedCarousel items={items} locale="en" />);
    const track = screen.getByTestId("featured-loop-track");
    const visibilityState = vi.spyOn(document, "visibilityState", "get");

    visibilityState.mockReturnValue("hidden");
    fireEvent(document, new Event("visibilitychange"));
    expect(track).toHaveAttribute("data-paused", "true");

    visibilityState.mockReturnValue("visible");
    fireEvent(document, new Event("visibilitychange"));
    expect(track).toHaveAttribute("data-paused", "false");
  });

  it("stays static when reduced motion is preferred", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    render(<FeaturedCarousel items={items} locale="en" />);

    expect(screen.getByTestId("featured-loop-track")).toHaveAttribute("data-paused", "true");
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

  it("localizes the motion control and destinations", () => {
    render(<FeaturedCarousel items={items} locale="th" />);

    expect(screen.getByRole("button", { name: "หยุดผลงานเด่น" })).toBeVisible();
    expect(screen.getByRole("link", { name: "ดู Starlit Traveler" })).toHaveAttribute(
      "href",
      "/th/portfolio?work=starlit-traveler",
    );
  });
});

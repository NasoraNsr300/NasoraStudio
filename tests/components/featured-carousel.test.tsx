import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { featuredItems } from "@/data/fixtures/public-content";
import { FeaturedCarousel } from "@/features/home/components/featured-carousel";

const items = [...featuredItems, { ...featuredItems[0], id: "featured-repeat", title: { th: "Repeat", en: "Repeat" } }];

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("FeaturedCarousel", () => {
  it("advances automatically at the configured interval", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel items={items} intervalMs={7000} />);

    act(() => vi.advanceTimersByTime(7000));

    expect(screen.getByLabelText("2 / 4")).toBeVisible();
  });

  it("moves with previous and next controls", () => {
    render(<FeaturedCarousel items={items} />);

    fireEvent.click(screen.getByRole("button", { name: "Next featured work" }));
    expect(screen.getByLabelText("2 / 4")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Previous featured work" }));
    expect(screen.getByLabelText("1 / 4")).toBeVisible();
  });

  it("moves with position controls", () => {
    render(<FeaturedCarousel items={items} />);

    fireEvent.click(screen.getByRole("button", { name: "Show featured work 3" }));

    expect(screen.getByLabelText("3 / 4")).toBeVisible();
  });

  it("pauses while hovered and resumes after the pointer leaves", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel items={items} />);
    const carousel = screen.getByRole("region", { name: "Featured work" });

    fireEvent.pointerEnter(carousel);
    act(() => vi.advanceTimersByTime(7000));
    expect(screen.getByLabelText("1 / 4")).toBeVisible();

    fireEvent.pointerLeave(carousel);
    act(() => vi.advanceTimersByTime(7000));
    expect(screen.getByLabelText("2 / 4")).toBeVisible();
  });

  it("pauses while focus is within and resumes after focus leaves", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel items={items} />);
    const carousel = screen.getByRole("region", { name: "Featured work" });

    fireEvent.focusIn(screen.getByRole("button", { name: "Next featured work" }));
    act(() => vi.advanceTimersByTime(7000));
    expect(screen.getByLabelText("1 / 4")).toBeVisible();

    fireEvent.focusOut(carousel, { relatedTarget: document.body });
    act(() => vi.advanceTimersByTime(7000));
    expect(screen.getByLabelText("2 / 4")).toBeVisible();
  });

  it("stays paused after manual navigation", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel items={items} />);

    fireEvent.click(screen.getByRole("button", { name: "Next featured work" }));
    act(() => vi.advanceTimersByTime(7000));

    expect(screen.getByLabelText("2 / 4")).toBeVisible();
  });

  it("pauses while the document is hidden and resumes when visible", () => {
    vi.useFakeTimers();
    render(<FeaturedCarousel items={items} />);
    const visibilityState = vi.spyOn(document, "visibilityState", "get");
    visibilityState.mockReturnValue("hidden");

    act(() => document.dispatchEvent(new Event("visibilitychange")));
    act(() => vi.advanceTimersByTime(7000));
    expect(screen.getByLabelText("1 / 4")).toBeVisible();

    visibilityState.mockReturnValue("visible");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    act(() => vi.advanceTimersByTime(7000));
    expect(screen.getByLabelText("2 / 4")).toBeVisible();
  });

  it("does not autoplay when reduced motion is preferred", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    render(<FeaturedCarousel items={items} />);

    act(() => vi.advanceTimersByTime(7000));

    expect(screen.getByLabelText("1 / 4")).toBeVisible();
  });
});

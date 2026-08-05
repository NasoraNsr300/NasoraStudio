import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { portfolioItems } from "@/data/fixtures/public-content";

const { useSearchParams } = vi.hoisted(() => ({
  useSearchParams: vi.fn(() => new URLSearchParams("q=forest&category=illustration&work=forest-letter")),
}));

vi.mock("next/navigation", () => ({ useSearchParams }));

import { PortfolioSearch } from "@/features/portfolio/components/portfolio-search";

afterEach(cleanup);

describe("PortfolioSearch", () => {
  it("applies q and category from the scoped Portfolio URL", () => {
    render(<PortfolioSearch items={portfolioItems} locale="en" />);

    expect(screen.getByRole("button", { name: "View Forest Letter" })).toBeVisible();
    expect(screen.getByRole("dialog", { name: "Forest Letter" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "View Starlit Traveler" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View Blue Hour" })).not.toBeInTheDocument();
  });
});

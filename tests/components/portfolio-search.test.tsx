import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { publicPortfolioItems } from "../fixtures/public-portfolio";

const { useSearchParams } = vi.hoisted(() => ({
  useSearchParams: vi.fn(() => new URLSearchParams(`q=moon&category=illustration&work=${publicPortfolioItems[0].id}`)),
}));

vi.mock("next/navigation", () => ({ useSearchParams }));

import { PortfolioSearch } from "@/features/portfolio/components/portfolio-search";

afterEach(cleanup);

describe("PortfolioSearch", () => {
  it("applies q and category from the scoped Portfolio URL", () => {
    render(<PortfolioSearch items={publicPortfolioItems} locale="en" />);

    expect(screen.getByRole("button", { name: "View Moon Garden" })).toBeVisible();
    expect(screen.getByRole("dialog", { name: "Moon Garden" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "View Star Child" })).not.toBeInTheDocument();
  });
});

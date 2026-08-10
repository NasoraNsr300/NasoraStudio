import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { PortfolioGallery } from "@/features/portfolio/components/portfolio-gallery";
import { publicPortfolioItems } from "../fixtures/public-portfolio";

afterEach(cleanup);

describe("PortfolioGallery", () => {
  it("filters by database category and opens one selected image", async () => {
    const user = userEvent.setup(); render(<PortfolioGallery items={publicPortfolioItems} locale="en" />);
    await user.click(screen.getByRole("button", { name: "Illustration" }));
    expect(screen.getByRole("button", { name: "View Moon Garden" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "View Star Child" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "View Moon Garden" }));
    expect(screen.getByRole("dialog", { name: "Moon Garden" }).querySelectorAll("img")).toHaveLength(1);
  });

  it("applies initial query, category, work and locale", () => {
    render(<PortfolioGallery initialCategory="illustration" initialQuery="moon" initialWork={publicPortfolioItems[0].id} items={publicPortfolioItems} locale="en" />);
    expect(screen.getByRole("button", { name: "View Moon Garden" })).toBeVisible();
    expect(screen.getByRole("dialog", { name: "Moon Garden" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "View Star Child" })).not.toBeInTheDocument();
  });

  it("announces localized empty results", () => {
    render(<PortfolioGallery initialQuery="missing" items={publicPortfolioItems} locale="en" />);
    expect(screen.getByRole("status")).toHaveTextContent("No portfolio work matches that search.");
  });
});

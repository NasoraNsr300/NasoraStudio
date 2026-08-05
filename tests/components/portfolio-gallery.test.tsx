import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { portfolioItems } from "@/data/fixtures/public-content";
import { PortfolioGallery } from "@/features/portfolio/components/portfolio-gallery";

afterEach(cleanup);

describe("PortfolioGallery", () => {
  it("filters artwork within the Portfolio page and opens only the selected asset", async () => {
    const user = userEvent.setup();
    render(<PortfolioGallery items={portfolioItems} locale="en" />);

    await user.click(screen.getByRole("button", { name: "Illustration" }));

    expect(screen.getByRole("button", { name: "View Starlit Traveler" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "View Blue Hour" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View Forest Letter" }));

    const dialog = screen.getByRole("dialog", { name: "Forest Letter" });
    expect(dialog).toHaveTextContent("Forest Letter");
    expect(dialog.querySelectorAll("img")).toHaveLength(1);
  });

  it("sorts the visible work without introducing gallery navigation controls", async () => {
    const user = userEvent.setup();
    render(<PortfolioGallery items={portfolioItems} locale="en" />);

    await user.selectOptions(screen.getByLabelText("Sort artwork"), "featured");

    const cards = screen.getAllByRole("button", { name: /View / });
    expect(cards[0]).toHaveAccessibleName("View Starlit Traveler");
    expect(cards[1]).toHaveAccessibleName("View Forest Letter");
    expect(screen.queryByRole("button", { name: /previous|next/i })).not.toBeInTheDocument();
  });

  it("applies the initial query and category to the Portfolio page only", () => {
    render(
      <PortfolioGallery
        initialCategory="illustration"
        initialQuery="forest"
        items={portfolioItems}
        locale="en"
      />,
    );

    expect(screen.getByRole("button", { name: "View Forest Letter" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "View Starlit Traveler" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View Blue Hour" })).not.toBeInTheDocument();
  });

  it("uses the selected locale for card and lightbox accessible content", async () => {
    const user = userEvent.setup();
    const item = portfolioItems[0];
    render(<PortfolioGallery items={[item]} locale="th" />);

    const card = screen.getByRole("button", { name: `ดู ${item.title.th}` });
    expect(screen.getByRole("img", { name: item.media.alt.th })).toBeVisible();

    await user.click(card);

    expect(screen.getByRole("dialog", { name: item.title.th })).toBeVisible();
    expect(screen.getByRole("button", { name: "ปิดภาพผลงาน" })).toBeVisible();
  });
});

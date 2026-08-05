import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { serviceCategories, serviceTypes } from "@/data/fixtures/public-content";
import { CommissionAlbumsPage } from "@/features/commission/components/commission-albums-page";
import { ServiceCategoryPage } from "@/features/commission/components/service-category-page";

afterEach(cleanup);

describe("Commission albums", () => {
  it("renders image-led album tiles with title, subtype count, availability, and recommendation without prices or requests", () => {
    render(<CommissionAlbumsPage categories={serviceCategories} locale="en" />);

    const chibi = screen.getByRole("link", { name: /view chibi album/i });
    expect(chibi).toHaveTextContent("Chibi");
    expect(chibi).toHaveTextContent("2 types");
    expect(chibi).toHaveTextContent("Open");
    expect(chibi).toHaveTextContent("Recommended");
    expect(screen.getByRole("img", { name: serviceCategories[0].coverMedia.alt.en })).toBeVisible();
    expect(screen.queryByText(/THB|\$/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /request/i })).not.toBeInTheDocument();
  });

  it("shows service-level price and actions only within a category, and disables requests for closed services", async () => {
    const user = userEvent.setup();
    const closedService = serviceTypes.find((service) => service.availability === "closed");
    if (!closedService) throw new Error("Expected a closed fixture service");

    render(
      <ServiceCategoryPage
        category={serviceCategories.find((category) => category.slug === closedService.categorySlug)!}
        locale="en"
        services={[closedService]}
      />,
    );

    expect(screen.getByText("THB 1,800")).toBeVisible();
    expect(screen.getByText("≈ $50")).toBeVisible();
    expect(screen.getByRole("button", { name: /request estimate for 3d model prop/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /view details for 3d model prop/i }));
    expect(screen.getByRole("dialog", { name: "3D Model Prop" })).toBeVisible();
  });
});

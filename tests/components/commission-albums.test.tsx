import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { serviceCategories, serviceTypes } from "@/data/fixtures/public-content";
import { CommissionAlbumsPage } from "@/features/commission/components/commission-albums-page";
import { ServiceCategoryPage } from "@/features/commission/components/service-category-page";

afterEach(cleanup);

describe("Commission albums", () => {
  it("renders image-led album tiles with title, subtype count, availability, and recommendation without prices or requests", () => {
    render(<CommissionAlbumsPage categories={serviceCategories} locale="en" services={serviceTypes} />);

    const chibi = screen.getByRole("button", { name: /view chibi album/i });
    expect(chibi).toHaveTextContent("Chibi");
    expect(chibi).toHaveTextContent("2 types");
    expect(chibi).toHaveTextContent("Open");
    expect(chibi).toHaveTextContent("Recommended");
    expect(screen.getByRole("img", { name: serviceCategories[0].coverMedia.alt.en })).toBeVisible();
    expect(screen.queryByText(/THB|\$/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /request/i })).not.toBeInTheDocument();
  });

  it("localizes album badges and service price guidance for Thai and English visitors", () => {
    const chibi = serviceCategories.find((category) => category.slug === "chibi");
    const closedService = serviceTypes.find((service) => service.availability === "closed");
    if (!chibi || !closedService) throw new Error("Expected fixture services");

    const { rerender } = render(<CommissionAlbumsPage categories={[chibi]} locale="th" services={serviceTypes} />);
    expect(screen.getByText("แนะนำ")).toBeVisible();
    expect(screen.getByText("เปิดรับ")).toBeVisible();
    expect(screen.queryByText("Recommended")).not.toBeInTheDocument();

    rerender(<ServiceCategoryPage category={serviceCategories.find((category) => category.slug === closedService.categorySlug)!} locale="en" services={[closedService]} />);
    expect(screen.getByText("Starting reference price")).toBeVisible();
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
    expect(screen.getByRole("button", { name: "Request Estimate" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "View Details & Rates" }));
    expect(screen.getByRole("dialog", { name: "3D Model Prop" })).toBeVisible();
  });

  it("opens an album and returns to the overview without changing the URL", async () => {
    const user = userEvent.setup();
    const initialUrl = window.location.href;

    render(<CommissionAlbumsPage categories={serviceCategories} locale="en" services={serviceTypes} />);

    await user.click(screen.getByRole("button", { name: /view chibi album/i }));
    expect(window.location.href).toBe(initialUrl);
    expect(screen.getByRole("heading", { level: 1, name: "Chibi" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Back to all albums" }));
    expect(window.location.href).toBe(initialUrl);
    expect(screen.getByRole("button", { name: /view chibi album/i })).toBeVisible();
  });

  it("uses fixed Thai action labels without repeating the service name", () => {
    const chibi = serviceCategories.find((category) => category.slug === "chibi");
    const chibiServices = serviceTypes.filter((service) => service.categorySlug === "chibi");
    if (!chibi || chibiServices.length === 0) throw new Error("Expected Chibi fixtures");

    render(<ServiceCategoryPage category={chibi} locale="th" services={chibiServices} />);

    expect(screen.getAllByRole("button", { name: "ประเมินราคา" })).not.toHaveLength(0);
    expect(screen.getAllByRole("button", { name: "ดูรายละเอียดและเรทราคา" })).not.toHaveLength(0);
    expect(screen.queryByRole("button", { name: /ประเมินราคา.+Chibi/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ดูรายละเอียด.+Chibi/i })).not.toBeInTheDocument();
  });
});

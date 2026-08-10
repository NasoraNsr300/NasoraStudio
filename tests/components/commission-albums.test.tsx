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

    const albumBreadcrumb = screen.getByRole("button", { name: "Back to all albums" });
    expect(albumBreadcrumb).toHaveTextContent("Album");
    expect(albumBreadcrumb.closest("p")).toHaveTextContent(/Album.*\/.*Chibi/);

    await user.click(albumBreadcrumb);
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

  it("does not label every service as full color in alternate view modes", async () => {
    const user = userEvent.setup();
    const chibi = serviceCategories.find((category) => category.slug === "chibi");
    const chibiServices = serviceTypes.filter((service) => service.categorySlug === "chibi");
    if (!chibi || chibiServices.length === 0) throw new Error("Expected Chibi fixtures");

    render(<ServiceCategoryPage category={chibi} locale="en" services={chibiServices} />);
    await user.click(screen.getByRole("button", { name: "List view" }));

    expect(screen.queryByText("FULL COLOR")).not.toBeInTheDocument();
  });

  it("opens an accessible detail dialog and restores focus without changing the URL", async () => {
    const user = userEvent.setup();
    const initialUrl = window.location.href;

    render(<CommissionAlbumsPage categories={serviceCategories} locale="en" services={serviceTypes} />);

    await user.click(screen.getByRole("button", { name: /view chibi album/i }));
    const detailsTrigger = screen.getAllByRole("button", { name: "View Details & Rates" })[0];
    await user.click(detailsTrigger);

    const dialog = screen.getByRole("dialog", { name: /Chibi/i });
    const labelledBy = dialog.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)).toBeVisible();
    expect(window.location.href).toBe(initialUrl);

    await user.click(screen.getByRole("button", { name: "Close details" }));
    expect(screen.queryByRole("dialog", { name: /Chibi/i })).not.toBeInTheDocument();
    expect(detailsTrigger).toHaveFocus();
    expect(window.location.href).toBe(initialUrl);
  });

  it("opens the estimate form directly without mounting service details underneath", async () => {
    const user = userEvent.setup();

    render(<CommissionAlbumsPage categories={serviceCategories} locale="en" services={serviceTypes} />);

    await user.click(screen.getByRole("button", { name: /view chibi album/i }));
    await user.click(screen.getAllByRole("button", { name: "Request Estimate" })[0]);

    expect(screen.getByRole("dialog", { name: "Request an estimate" })).toBeVisible();
    expect(screen.getAllByRole("dialog", { hidden: true })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument();
  });
});

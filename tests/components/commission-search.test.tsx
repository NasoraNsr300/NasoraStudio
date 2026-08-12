import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { serviceCategories, serviceTypes } from "@/data/fixtures/public-content";

const { refresh, useRouter, useSearchParams } = vi.hoisted(() => ({
  refresh: vi.fn(),
  useRouter: vi.fn(),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock("next/navigation", () => ({ useRouter, useSearchParams }));

import { CommissionSearch } from "@/features/commission/components/commission-search";

afterEach(cleanup);

describe("CommissionSearch", () => {
  beforeEach(() => {
    refresh.mockClear();
    useRouter.mockReturnValue({ refresh });
  });

  it("finds published categories and subtypes from the contextual q parameter", () => {
    useSearchParams.mockReturnValue(new URLSearchParams("q=illustration"));
    render(<CommissionSearch categories={serviceCategories} locale="en" services={serviceTypes} />);

    expect(screen.getByRole("heading", { name: "Commission search results" })).toBeVisible();
    expect(screen.getByRole("link", { name: /Illustration album/ })).toHaveAttribute("href", "/en/commission/illustration");
    expect(screen.getByRole("link", { name: /Illustration Half Body/ })).toHaveAttribute("href", "/en/commission/illustration#illustration-halfbody");
    expect(screen.queryByText("Private draft")).not.toBeInTheDocument();
    expect(screen.queryByText("Draft service")).not.toBeInTheDocument();
  });

  it("renders a localized useful empty state", () => {
    useSearchParams.mockReturnValue(new URLSearchParams("q=ไม่พบแน่นอน"));
    render(<CommissionSearch categories={serviceCategories} locale="th" services={serviceTypes} />);

    expect(screen.getByRole("status")).toHaveTextContent("ไม่พบหมวดหมู่หรือรูปแบบงานที่ตรงกับคำค้น");
  });

  it("refreshes an open public catalog tab when Admin saves catalog data", () => {
    useSearchParams.mockReturnValue(new URLSearchParams());
    render(<CommissionSearch categories={serviceCategories} locale="en" services={serviceTypes} />);

    window.dispatchEvent(new StorageEvent("storage", { key: "nasora:catalog-updated" }));

    expect(refresh).toHaveBeenCalledOnce();
  });
});

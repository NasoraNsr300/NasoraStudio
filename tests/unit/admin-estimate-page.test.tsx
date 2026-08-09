import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({ getAdminEstimateRequest: vi.fn(), listAdminEstimateRequests: vi.fn() }));

vi.mock("@/features/admin/estimates/data/admin-estimate-repository.server", () => repository);
vi.mock("@/features/admin/components/admin-section-pages", () => ({
  AdminEstimatesPage: ({ detail }: { detail: { id: string } | null }) => <div data-testid="detail-id">{detail?.id ?? "none"}</div>,
}));

import EstimatesPage from "@/app/(admin)/admin/estimates/page";

describe("admin estimate page selection", () => {
  it("ignores a malformed deep link without querying the private detail", async () => {
    repository.listAdminEstimateRequests.mockResolvedValue([]);

    render(await EstimatesPage({ searchParams: Promise.resolve({ request: "not-a-uuid" }) }));

    expect(repository.getAdminEstimateRequest).not.toHaveBeenCalled();
    expect(screen.getByTestId("detail-id")).toHaveTextContent("none");
  });

  it("loads a valid UUID detail", async () => {
    const id = "8c8b9d06-6619-471f-9b7f-ce1f619827f6";
    repository.listAdminEstimateRequests.mockResolvedValue([]);
    repository.getAdminEstimateRequest.mockResolvedValue({ id });

    render(await EstimatesPage({ searchParams: Promise.resolve({ request: id }) }));

    expect(repository.getAdminEstimateRequest).toHaveBeenCalledWith(id);
  });
});

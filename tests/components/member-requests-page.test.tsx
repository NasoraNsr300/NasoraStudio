import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { createCommissionRequestRepository } from "@/features/commission/data/commission-request-repository";
import { MemberRequestsPage } from "@/features/member/components/member-requests-page";

vi.mock("@/features/member/components/member-sidebar", () => ({
  MemberSidebar: () => <nav aria-label="Member sidebar" />,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type Repository = ReturnType<typeof createCommissionRequestRepository>;
const auth = { status: "signedIn" as const, user: { email: "member@example.com", id: "user-1", nickname: "Moon" } };

function repositoryWith(data: Awaited<ReturnType<Repository["listMine"]>>): Repository {
  return {
    cancel: vi.fn().mockResolvedValue({ data: undefined, ok: true }),
    listMine: vi.fn().mockResolvedValue(data),
    loadMemberIdentity: vi.fn(),
    submit: vi.fn(),
  } as unknown as Repository;
}

describe("MemberRequestsPage", () => {
  it("renders an empty state from real repository data", async () => {
    render(<MemberRequestsPage auth={auth} locale="en" repository={repositoryWith({ data: [], ok: true })} />);

    expect(screen.getByText("Loading requests...")).toBeVisible();
    expect(await screen.findByText("You have not submitted an estimate request yet.")).toBeVisible();
    expect(screen.getByText("0 items")).toBeVisible();
  });

  it("renders stored requests and derives summary counts", async () => {
    const repository = repositoryWith({ data: [
      request({ id: "r1", requestCode: "REQ-ONE000000", status: "submitted" }),
      request({ id: "r2", requestCode: "REQ-TWO000000", status: "quoted" }),
      request({ id: "r3", requestCode: "REQ-THREE0000", status: "cancelled" }),
    ], ok: true });
    render(<MemberRequestsPage auth={auth} locale="en" repository={repository} />);

    expect(await screen.findByText(/REQ-ONE000000/)).toBeVisible();
    expect(screen.getByText(/REQ-TWO000000/)).toBeVisible();
    expect(screen.getByText(/REQ-THREE0000/)).toBeVisible();
    expect(screen.getAllByText("1")).toHaveLength(3);
    expect(screen.getByText("3 items")).toBeVisible();
    expect(screen.getByRole("link", { name: "View quote REQ-TWO000000" })).toHaveAttribute("href", "/en/member/requests/r2");
  });

  it("cancels only an awaiting request and updates it locally", async () => {
    const user = userEvent.setup();
    const repository = repositoryWith({ data: [request({ id: "r1", requestCode: "REQ-ONE000000", status: "submitted" })], ok: true });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<MemberRequestsPage auth={auth} locale="en" repository={repository} />);

    await user.click(await screen.findByRole("button", { name: "Cancel request" }));
    await waitFor(() => expect(repository.cancel).toHaveBeenCalledWith("r1"));
    expect(screen.getByText(/Cancelled/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Cancel request" })).not.toBeInTheDocument();
  });

  it("shows repository errors without fixture rows", async () => {
    render(<MemberRequestsPage auth={auth} locale="en" repository={repositoryWith({ message: "Unable to load", ok: false })} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load");
    expect(screen.queryByText("REQ-260806-0042")).not.toBeInTheDocument();
  });
});

function request(overrides: { id: string; requestCode: string; status: "cancelled" | "quoted" | "submitted" }) {
  return {
    budgetMaxSatang: 600_000,
    budgetMinSatang: 350_000,
    id: overrides.id,
    requestCode: overrides.requestCode,
    requestedDeadline: "2026-09-01",
    serviceName: { en: "Illustration Full Body", th: "ภาพประกอบเต็มตัว" },
    status: overrides.status,
    submittedAt: "2026-08-06T10:00:00Z",
    usageType: "personal" as const,
  };
}

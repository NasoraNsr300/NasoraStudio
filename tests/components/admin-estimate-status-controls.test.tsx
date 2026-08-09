import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

import { AdminEstimateStatusControls } from "@/features/admin/estimates/components/admin-estimate-status-controls";

afterEach(() => {
  cleanup();
  navigation.refresh.mockReset();
  vi.unstubAllGlobals();
});

describe("AdminEstimateStatusControls", () => {
  it("posts only the status using its non-private request id", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn(async () => new Response(JSON.stringify({ status: "reviewing" }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    render(<AdminEstimateStatusControls requestId="8c8b9d06-6619-471f-9b7f-ce1f619827f6" status="submitted" />);

    await user.click(screen.getByRole("button", { name: "Review request" }));

    expect(fetch).toHaveBeenCalledWith("/api/admin/estimates/8c8b9d06-6619-471f-9b7f-ce1f619827f6/status", expect.objectContaining({
      body: JSON.stringify({ status: "reviewing" }), method: "POST",
    }));
    expect(navigation.refresh).toHaveBeenCalledOnce();
  });

  it("does not submit a decline until a reason is supplied", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<AdminEstimateStatusControls requestId="8c8b9d06-6619-471f-9b7f-ce1f619827f6" status="submitted" />);

    await user.click(screen.getByRole("button", { name: "Decline request" }));
    await user.click(screen.getByRole("button", { name: "Confirm decline" }));

    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByText("A decline reason is required.")).toBeVisible();
  });
});

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

import { AdminQuoteEditor } from "@/features/admin/estimates/components/admin-quote-editor";

afterEach(() => {
  cleanup();
  navigation.refresh.mockReset();
  vi.unstubAllGlobals();
});

const props = {
  requestId: "8c8b9d06-6619-471f-9b7f-ce1f619827f6",
  requestedDeadline: "2026-09-20",
  serviceName: { en: "Half-body illustration", th: "ภาพวาดครึ่งตัว" },
};

describe("AdminQuoteEditor", () => {
  it("starts with the approved deposit, revisions, and duration defaults", () => {
    render(<AdminQuoteEditor {...props} />);

    expect(screen.getByRole("spinbutton", { name: "Deposit percent" })).toHaveValue(50);
    expect(screen.getByRole("spinbutton", { name: "Free revisions" })).toHaveValue(4);
    expect(screen.getByRole("spinbutton", { name: "Minimum duration days" })).toHaveValue(7);
    expect(screen.getByRole("spinbutton", { name: "Maximum duration days" })).toHaveValue(14);
    expect(screen.getByLabelText("Proposed deadline")).toHaveValue("2026-09-20");
    expect(screen.getByText(/approx\. usd/i)).toBeVisible();
  });

  it("calculates the authoritative THB total from editable base and addition lines", async () => {
    const user = userEvent.setup();
    render(<AdminQuoteEditor {...props} />);

    const baseLine = screen.getByRole("group", { name: "Quote item 1" });
    await user.clear(within(baseLine).getByRole("spinbutton", { name: "Unit price THB" }));
    await user.type(within(baseLine).getByRole("spinbutton", { name: "Unit price THB" }), "2500");
    await user.click(screen.getByRole("button", { name: "Add quote item" }));
    const addition = screen.getByRole("group", { name: "Quote item 2" });
    await user.clear(within(addition).getByRole("spinbutton", { name: "Quantity" }));
    await user.type(within(addition).getByRole("spinbutton", { name: "Quantity" }), "2");
    await user.clear(within(addition).getByRole("spinbutton", { name: "Unit price THB" }));
    await user.type(within(addition).getByRole("spinbutton", { name: "Unit price THB" }), "500");

    expect(screen.getByTestId("quote-total-thb")).toHaveTextContent("฿3,500");
    expect(screen.getByTestId("quote-total-usd")).toHaveTextContent("Approx. USD");
  });

  it("sends only the quote snapshot and preserves satang as the authoritative amount", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ quoteId: "quote-1", status: "sent", version: 1 }), { status: 201 }));
    vi.stubGlobal("fetch", fetch);
    render(<AdminQuoteEditor {...props} />);

    const baseLine = screen.getByRole("group", { name: "Quote item 1" });
    await user.clear(within(baseLine).getByRole("spinbutton", { name: "Unit price THB" }));
    await user.type(within(baseLine).getByRole("spinbutton", { name: "Unit price THB" }), "2500.50");
    await user.click(screen.getByRole("button", { name: "Save and send quote" }));

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0]!;
    const body = JSON.parse(String(init?.body));
    expect(url).toBe(`/api/admin/estimates/${props.requestId}/quotes`);
    expect(init).toEqual(expect.objectContaining({ headers: { "content-type": "application/json" }, method: "POST" }));
    expect(body).toEqual(expect.objectContaining({
      depositPercent: 50,
      freeRevisions: 4,
      totalSatang: 250_050,
    }));
    expect(body.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.stringify(body)).not.toContain("contact");
    expect(navigation.refresh).toHaveBeenCalledOnce();
  });

  it("does not submit an incomplete expiry or invalid duration range", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<AdminQuoteEditor {...props} />);

    await user.clear(screen.getByLabelText("Quote expiry"));
    await user.clear(screen.getByRole("spinbutton", { name: "Maximum duration days" }));
    await user.type(screen.getByRole("spinbutton", { name: "Maximum duration days" }), "2");
    await user.click(screen.getByRole("button", { name: "Save and send quote" }));

    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Complete a valid quote before sending.");
  });
});

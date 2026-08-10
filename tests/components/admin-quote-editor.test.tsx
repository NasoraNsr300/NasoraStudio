import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

import { AdminQuoteEditor } from "@/features/admin/estimates/components/admin-quote-editor";

afterEach(() => {
  cleanup();
  navigation.refresh.mockReset();
  vi.restoreAllMocks();
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
    await user.clear(within(baseLine).getByRole("textbox", { name: "Unit price THB" }));
    await user.type(within(baseLine).getByRole("textbox", { name: "Unit price THB" }), "2500");
    await user.click(screen.getByRole("button", { name: "Add quote item" }));
    const addition = screen.getByRole("group", { name: "Quote item 2" });
    await user.clear(within(addition).getByRole("textbox", { name: "Quantity" }));
    await user.type(within(addition).getByRole("textbox", { name: "Quantity" }), "2");
    await user.clear(within(addition).getByRole("textbox", { name: "Unit price THB" }));
    await user.type(within(addition).getByRole("textbox", { name: "Unit price THB" }), "500");

    expect(screen.getByTestId("quote-total-thb")).toHaveTextContent("฿3,500");
    expect(screen.getByTestId("quote-total-usd")).toHaveTextContent("Approx. USD");
  });

  it("sends only the quote snapshot and preserves satang as the authoritative amount", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ quoteId: "quote-1", status: "sent", version: 1 }), { status: 201 }));
    vi.stubGlobal("fetch", fetch);
    render(<AdminQuoteEditor {...props} />);

    const baseLine = screen.getByRole("group", { name: "Quote item 1" });
    await user.clear(within(baseLine).getByRole("textbox", { name: "Unit price THB" }));
    await user.type(within(baseLine).getByRole("textbox", { name: "Unit price THB" }), "2500.50");
    await user.click(screen.getByRole("button", { name: "Save and send quote" }));

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0]!;
    const body = JSON.parse(String(init?.body));
    expect(url).toBe(`/api/admin/estimates/${props.requestId}/quotes`);
    expect(init).toEqual(expect.objectContaining({ headers: { "content-type": "application/json" }, method: "POST" }));
    expect(body).toEqual(expect.objectContaining({
      depositPercent: 50,
      freeRevisions: 4,
      totalSatang: "250050",
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

  it("rejects an amount above the canonical money ceiling", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetch);
    render(<AdminQuoteEditor {...props} />);

    const amount = screen.getByRole("textbox", { name: "Unit price THB" });
    await user.clear(amount);
    await user.type(amount, "21474836.48");
    await user.click(screen.getByRole("button", { name: "Save and send quote" }));

    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Complete a valid quote before sending.");
  });

  it.each(["1.5", "Infinity"])('rejects invalid quantity "%s" without crashing', async (quantity) => {
    const user = userEvent.setup();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<AdminQuoteEditor {...props} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Quantity" }), { target: { value: quantity } });
    await user.click(screen.getByRole("button", { name: "Save and send quote" }));

    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Complete a valid quote before sending.");
  });

  it("reuses the same submission key after an ambiguous network failure", async () => {
    const user = userEvent.setup();
    const firstKey = "69c36e90-b095-438a-b267-1df2052045ee" as ReturnType<Crypto["randomUUID"]>;
    const nextKey = "b77cc03c-8b83-4ff5-9c97-bb305b5538ef" as ReturnType<Crypto["randomUUID"]>;
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValueOnce(firstKey).mockReturnValueOnce(nextKey);
    const fetch = vi.fn()
      .mockRejectedValueOnce(new Error("connection closed after send"))
      .mockResolvedValueOnce(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetch);
    render(<AdminQuoteEditor {...props} />);
    await user.type(screen.getByRole("textbox", { name: "Unit price THB" }), "1000");

    await user.click(screen.getByRole("button", { name: "Save and send quote" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to send quote.");
    await user.click(screen.getByRole("button", { name: "Save and send quote" }));

    const keys = fetch.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).idempotencyKey);
    expect(keys).toEqual([firstKey, firstKey]);
  });

  it("rotates the submission key only after success so a second intentional send creates v2", async () => {
    const user = userEvent.setup();
    const firstKey = "69c36e90-b095-438a-b267-1df2052045ee" as ReturnType<Crypto["randomUUID"]>;
    const secondKey = "b77cc03c-8b83-4ff5-9c97-bb305b5538ef" as ReturnType<Crypto["randomUUID"]>;
    const thirdKey = "c46f218a-bba4-4d47-b9d2-470ad289fc55" as ReturnType<Crypto["randomUUID"]>;
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValueOnce(firstKey).mockReturnValueOnce(secondKey).mockReturnValueOnce(thirdKey);
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ quoteId: "9bc1c392-2b24-4df8-b971-b2320c51555c", status: "sent", version: 1 }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ quoteId: "2b50ea28-ef92-43de-8d43-e34d3e457a90", status: "sent", version: 2 }), { status: 201 }));
    vi.stubGlobal("fetch", fetch);
    render(<AdminQuoteEditor {...props} />);
    await user.type(screen.getByRole("textbox", { name: "Unit price THB" }), "1000");

    await user.click(screen.getByRole("button", { name: "Save and send quote" }));
    await user.click(screen.getByRole("button", { name: "Save and send quote" }));

    const keys = fetch.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).idempotencyKey);
    expect(keys).toEqual([firstKey, secondKey]);
    expect(navigation.refresh).toHaveBeenCalledTimes(2);
  });
});

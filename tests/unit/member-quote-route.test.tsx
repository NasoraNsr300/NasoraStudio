import { describe, expect, it, vi } from "vitest";

const notFound = vi.hoisted(() => vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }));
const page = vi.hoisted(() => vi.fn(() => <div />));

vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/features/member/components/member-request-quote-page", () => ({ MemberRequestQuotePage: page }));

import MemberRequestQuoteRoute from "@/app/[locale]/member/requests/[requestId]/page";

describe("MemberRequestQuoteRoute", () => {
  it("rejects a malformed request UUID at the route boundary before rendering the client page", async () => {
    await expect(MemberRequestQuoteRoute({ params: Promise.resolve({ locale: "en", requestId: "not-a-uuid" }) })).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalledOnce();
    expect(page).not.toHaveBeenCalled();
  });

  it("renders a valid UUID route", async () => {
    const result = await MemberRequestQuoteRoute({ params: Promise.resolve({ locale: "en", requestId: "8c8b9d06-6619-471f-9b7f-ce1f619827f6" }) });

    expect(result).toMatchObject({ props: { locale: "en", requestId: "8c8b9d06-6619-471f-9b7f-ce1f619827f6" }, type: page });
  });
});

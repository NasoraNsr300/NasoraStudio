import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MemberRequestQuotePage } from "@/features/member/components/member-request-quote-page";
import type { MemberQuote } from "@/features/member/data/member-quote-repository";

vi.mock("@/shared/auth/auth-session-provider", () => ({
  useAuthSession: () => ({ user: { nickname: "Member" } }),
  useOptionalAuthSession: () => ({ status: "signedIn" }),
}));

const requestId = "8c8b9d06-6619-471f-9b7f-ce1f619827f6";
const quoteId = "bf49a462-ef33-44d4-95d4-1a0de68472c5";
const paymentId = "d75a0770-6178-4bb8-9a75-f076984ffac8";
const quote: MemberQuote = {
  depositPercent: 50, depositSatang: 50_000, durationMaxDays: 14, durationMinDays: 7,
  expiresAt: "2026-09-01T12:00:00.000Z", freeRevisionCount: 4, id: quoteId, items: [],
  outstandingSatang: 100_000, proposedDeadline: "2026-09-20", requestId,
  scope: { en: "One illustration", th: "ภาพหนึ่งภาพ" }, status: "sent",
  termsDocument: { slug: "commission-terms", version: 1 }, totalSatang: 100_000, version: 1,
};

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("member payment slip upload", () => {
  it("uses one same-origin raw upload and reuses its key after a failed retry", async () => {
    const repository = { load: vi.fn(async () => ({ data: quote, ok: true as const })) };
    const requests: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    let uploadAttempts = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push([input, init]);
      if (String(input).endsWith("/intent")) return Response.json({ amountSatang: 50_000, paymentId, promptPayPayload: "qr" });
      uploadAttempts += 1;
      return uploadAttempts === 1 ? new Response(null, { status: 503 }) : Response.json({ slipId: "a2eae2d8-f2ed-47bd-8335-43a79e33e4b7", status: "pending_review" });
    }));
    const user = userEvent.setup();
    render(<MemberRequestQuotePage locale="en" repository={repository as never} requestId={requestId} />);
    await user.click(await screen.findByRole("button", { name: "Pay deposit" }));
    const input = await screen.findByLabelText("Upload slip") as HTMLInputElement;
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
    const file = new File([bytes], "slip.png", { lastModified: 1, type: "image/png" });
    await user.upload(input, file);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Slip upload failed/));
    expect(input.value).toBe("");
    await user.upload(input, file);
    await screen.findByText("Slip submitted for review.");

    const uploads = requests.filter(([url]) => String(url).endsWith("/slip-upload"));
    expect(uploads).toHaveLength(2);
    expect(uploads[0][1]?.method).toBe("POST");
    expect(uploads[0][1]?.body).toBe(file);
    expect((uploads[0][1]?.headers as Record<string, string>)["idempotency-key"]).toBe((uploads[1][1]?.headers as Record<string, string>)["idempotency-key"]);
  });
});

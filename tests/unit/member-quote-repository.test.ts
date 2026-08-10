import { describe, expect, it, vi } from "vitest";

import { createMemberQuoteRepository } from "@/features/member/data/member-quote-repository";

const requestId = "8c8b9d06-6619-471f-9b7f-ce1f619827f6";

function query(result: { data: unknown; error: { message?: string } | null }) {
  return {
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    order: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    then: (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject),
  };
}

describe("createMemberQuoteRepository", () => {
  it("reads the latest customer-visible quote and derives outstanding from verified payments", async () => {
    const ownedRequest = query({ data: { id: requestId }, error: null });
    const quote = query({ data: quoteRow(), error: null });
    const items = query({ data: [quoteItemRow()], error: null });
    const payments = query({ data: [{ amount_satang: 25_000 }, { amount_satang: 25_000 }], error: null });
    const from = vi.fn()
      .mockReturnValueOnce(ownedRequest)
      .mockReturnValueOnce(quote)
      .mockReturnValueOnce(items)
      .mockReturnValueOnce(payments);
    const repository = createMemberQuoteRepository({ from });

    const result = await repository.load(requestId);

    expect(result).toEqual({
      data: expect.objectContaining({
        depositSatang: 50_000,
        outstandingSatang: 50_000,
        paidSatang: 50_000,
        requestId,
        totalSatang: 100_000,
      }),
      ok: true,
    });
    expect(ownedRequest.eq).toHaveBeenNthCalledWith(1, "id", requestId);
    expect(quote.eq).not.toHaveBeenCalledWith("status", "sent");
    expect(quote.order).toHaveBeenCalledWith("version", { ascending: false });
    expect(quote.limit).toHaveBeenCalledWith(1);
    expect(items.eq).toHaveBeenCalledWith("quote_id", "bf49a462-ef33-44d4-95d4-1a0de68472c5");
    expect(payments.eq).toHaveBeenCalledWith("quote_id", "bf49a462-ef33-44d4-95d4-1a0de68472c5");
  });

  it("does not query quote data when RLS does not expose the request, including Guest requests", async () => {
    const ownedRequest = query({ data: null, error: null });
    const from = vi.fn().mockReturnValue(ownedRequest);
    const repository = createMemberQuoteRepository({ from });

    const result = await repository.load(requestId);

    expect(result).toEqual({ data: null, ok: true });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed request ids without querying Supabase", async () => {
    const from = vi.fn();
    const repository = createMemberQuoteRepository({ from });

    await expect(repository.load("not-a-uuid")).resolves.toEqual({ message: "Unable to load this quote", ok: false });
    expect(from).not.toHaveBeenCalled();
  });
});

function quoteRow() {
  return {
    deposit_percent: 50,
    deposit_satang: 50_000,
    estimated_duration_max_days: 14,
    estimated_duration_min_days: 7,
    expires_at: "2026-09-01T12:00:00.000Z",
    free_revision_count: 4,
    id: "bf49a462-ef33-44d4-95d4-1a0de68472c5",
    proposed_deadline: "2026-09-20",
    request_id: requestId,
    scope_summary: { en: "One full-body illustration", th: "ภาพประกอบเต็มตัว 1 ภาพ" },
    status: "sent",
    terms_document_slug: "commission-terms",
    terms_document_version: 1,
    total_satang: 100_000,
    version: 1,
  };
}

function quoteItemRow() {
  return {
    description_snapshot: { en: "Flat colour", th: "ลงสีแบบเรียบ" },
    display_order: 0,
    id: "8204a3bf-a951-4a35-b8a0-0974f2b99327",
    item_type: "base",
    label_snapshot: { en: "Full body", th: "เต็มตัว" },
    line_total_satang: 100_000,
    quantity: 1,
    unit_amount_satang: 100_000,
  };
}

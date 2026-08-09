import { describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/shared/supabase/server", () => supabase);

import { POST } from "@/app/api/admin/estimates/[requestId]/quotes/route";

const requestId = "8c8b9d06-6619-471f-9b7f-ce1f619827f6";
const idempotencyKey = "69c36e90-b095-438a-b267-1df2052045ee";
const params = Promise.resolve({ requestId });
const payload = {
  depositPercent: 50,
  durationMaxDays: 14,
  durationMinDays: 10,
  expiresAt: "2026-08-31T17:00:00.000Z",
  freeRevisions: 4,
  idempotencyKey,
  items: [{
    description: { en: "One character", th: "หนึ่งตัวละคร" },
    itemType: "base",
    label: { en: "Base illustration", th: "ภาพหลัก" },
    lineTotalSatang: "250000",
    quantity: 1,
    unitAmountSatang: "250000",
  }],
  proposedDeadline: "2026-09-20",
  scope: { en: "Half-body illustration", th: "ภาพครึ่งตัว" },
  termsDocument: { slug: "commission-terms", version: 1 },
  totalSatang: "250000",
};

function request(body: unknown = payload, headers: HeadersInit = {}) {
  return new Request(`http://localhost/api/admin/estimates/${requestId}/quotes`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", origin: "http://localhost", ...headers },
    method: "POST",
  });
}

function client({ role = "admin", rpc = vi.fn(async () => ({ data: [{ quote_id: "quote-1", status: "sent", version: 1 }], error: null })), user = { id: "admin-1" } }: {
  role?: string;
  rpc?: ReturnType<typeof vi.fn>;
  user?: { id: string } | null;
} = {}) {
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user: user && { ...user, app_metadata: { role } } }, error: null })) },
    rpc,
  };
}

describe("POST /api/admin/estimates/:requestId/quotes", () => {
  it("rejects malformed request and idempotency UUIDs before mutation", async () => {
    const rpc = vi.fn();
    supabase.createClient.mockResolvedValue(client({ rpc }));

    const badRequest = await POST(request(), { params: Promise.resolve({ requestId: "not-a-uuid" }) });
    const badKey = await POST(request({ ...payload, idempotencyKey: "not-a-uuid" }), { params });

    expect(badRequest.status).toBe(400);
    expect(badKey.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("requires same-origin requests and the exact application/json media type", async () => {
    const rpc = vi.fn();
    supabase.createClient.mockResolvedValue(client({ rpc }));

    const crossOrigin = await POST(request(payload, { origin: "https://attacker.example" }), { params });
    const parameterizedJson = await POST(request(payload, { "content-type": "application/json; charset=utf-8" }), { params });

    expect(crossOrigin.status).toBe(403);
    expect(parameterizedJson.status).toBe(415);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("ignores spoofed forwarded headers when checking the framework-normalized request origin", async () => {
    const rpc = vi.fn();
    supabase.createClient.mockResolvedValue(client({ rpc }));
    const spoofedRequest = new Request(`http://internal:3000/api/admin/estimates/${requestId}/quotes`, {
      body: JSON.stringify(payload),
      headers: {
        "content-type": "application/json",
        origin: "https://admin.nasora.example",
        "x-forwarded-host": "admin.nasora.example",
        "x-forwarded-proto": "https",
      },
      method: "POST",
    });

    const response = await POST(spoofedRequest, { params });

    expect(response.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated and non-admin sessions", async () => {
    supabase.createClient.mockResolvedValueOnce(client({ user: null }));
    const unauthenticated = await POST(request(), { params });

    const rpc = vi.fn();
    supabase.createClient.mockResolvedValueOnce(client({ role: "member", rpc }));
    const forbidden = await POST(request(), { params });

    expect(unauthenticated.status).toBe(401);
    expect(forbidden.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects totals that do not equal their line item snapshots", async () => {
    const rpc = vi.fn();
    supabase.createClient.mockResolvedValue(client({ rpc }));

    const response = await POST(request({ ...payload, totalSatang: "1" }), { params });

    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("passes the complete immutable snapshot to the guarded database command", async () => {
    const rpc = vi.fn(async () => ({ data: [{ quote_id: "9bc1c392-2b24-4df8-b971-b2320c51555c", status: "sent", version: 1 }], error: null }));
    supabase.createClient.mockResolvedValue(client({ rpc }));

    const response = await POST(request(), { params });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ quoteId: "9bc1c392-2b24-4df8-b971-b2320c51555c", status: "sent", version: 1 });
    expect(rpc).toHaveBeenCalledWith("admin_save_and_send_quote", {
      p_payload: payload,
      p_request_id: requestId,
    });
  });

  it("preserves the submission key so repeated submissions return the same quote", async () => {
    const rpc = vi.fn(async () => ({ data: [{ quote_id: "9bc1c392-2b24-4df8-b971-b2320c51555c", status: "superseded", version: 1 }], error: null }));
    supabase.createClient.mockResolvedValue(client({ rpc }));

    const first = await POST(request(), { params });
    const duplicate = await POST(request(), { params });

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(201);
    expect(await duplicate.json()).toEqual({ quoteId: "9bc1c392-2b24-4df8-b971-b2320c51555c", status: "superseded", version: 1 });
    expect(rpc).toHaveBeenNthCalledWith(2, "admin_save_and_send_quote", expect.objectContaining({
      p_payload: expect.objectContaining({ idempotencyKey }),
    }));
  });

  it("allows an expired original payload to reach the database for a stable replay", async () => {
    const rpc = vi.fn(async () => ({ data: [{ quote_id: "9bc1c392-2b24-4df8-b971-b2320c51555c", status: "superseded", version: 1 }], error: null }));
    supabase.createClient.mockResolvedValue(client({ rpc }));

    const response = await POST(request({ ...payload, expiresAt: "2020-08-31T17:00:00.000Z" }), { params });

    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledOnce();
  });

  it("accepts precise satang strings beyond the JavaScript safe integer range", async () => {
    const exactSatang = "9007199254740993";
    const rpc = vi.fn(async () => ({ data: [{ quote_id: "9bc1c392-2b24-4df8-b971-b2320c51555c", status: "sent", version: 1 }], error: null }));
    supabase.createClient.mockResolvedValue(client({ rpc }));

    const response = await POST(request({
      ...payload,
      items: [{ ...payload.items[0], lineTotalSatang: exactSatang, unitAmountSatang: exactSatang }],
      totalSatang: exactSatang,
    }), { params });

    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith("admin_save_and_send_quote", expect.objectContaining({
      p_payload: expect.objectContaining({ totalSatang: exactSatang }),
    }));
  });

  it("rejects numeric satang and decimal strings outside the PostgreSQL bigint range", async () => {
    const rpc = vi.fn();
    supabase.createClient.mockResolvedValue(client({ rpc }));

    const numeric = await POST(request({ ...payload, totalSatang: 250_000 }), { params });
    const malformed = await POST(request({ ...payload, totalSatang: "1.5" }), { params });
    const malformedItem = await POST(request({
      ...payload,
      items: [{ ...payload.items[0], lineTotalSatang: "wat", unitAmountSatang: "wat" }],
    }), { params });
    const overflow = await POST(request({
      ...payload,
      items: [{ ...payload.items[0], lineTotalSatang: "9223372036854775808", unitAmountSatang: "9223372036854775808" }],
      totalSatang: "9223372036854775808",
    }), { params });

    expect(numeric.status).toBe(400);
    expect(malformed.status).toBe(400);
    expect(malformedItem.status).toBe(400);
    expect(overflow.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("requires a UUID quote id and accepts a persisted replay status", async () => {
    supabase.createClient.mockResolvedValueOnce(client({ rpc: vi.fn(async () => ({ data: [{ quote_id: "not-a-uuid", status: "sent", version: 1 }], error: null })) }));
    const invalidId = await POST(request(), { params });
    supabase.createClient.mockResolvedValueOnce(client({ rpc: vi.fn(async () => ({ data: [{ quote_id: "9bc1c392-2b24-4df8-b971-b2320c51555c", status: "accepted", version: 1 }], error: null })) }));
    const replay = await POST(request(), { params });

    expect(invalidId.status).toBe(400);
    expect(replay.status).toBe(201);
    expect(await replay.json()).toEqual({ quoteId: "9bc1c392-2b24-4df8-b971-b2320c51555c", status: "accepted", version: 1 });
  });

  it("maps an idempotency key reused with a different payload to conflict", async () => {
    supabase.createClient.mockResolvedValue(client({ rpc: vi.fn(async () => ({ data: null, error: { message: "idempotency_payload_mismatch" } })) }));

    const response = await POST(request(), { params });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Submission key was already used for a different quote" });
  });
});

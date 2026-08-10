import { describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/shared/supabase/server", () => supabase);

import { POST } from "@/app/api/admin/estimates/[requestId]/status/route";

const requestId = "8c8b9d06-6619-471f-9b7f-ce1f619827f6";
const params = Promise.resolve({ requestId });

function request(body: unknown, headers: HeadersInit = {}) {
  return new Request(`http://localhost/api/admin/estimates/${requestId}/status`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", origin: "http://localhost", ...headers },
    method: "POST",
  });
}

function client({ role = "admin", rpc = vi.fn(async () => ({ data: [{ request_id: "request-1", status: "reviewing" }], error: null })), user = { id: "admin-1" } }: {
  role?: string;
  rpc?: ReturnType<typeof vi.fn>;
  user?: { id: string } | null;
} = {}) {
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user: user && { ...user, app_metadata: { role } } }, error: null })) },
    rpc,
  };
}

describe("POST /api/admin/estimates/:requestId/status", () => {
  it("rejects a malformed request id before it can parse or mutate state", async () => {
    const rpc = vi.fn();
    supabase.createClient.mockResolvedValue(client({ rpc }));

    const response = await POST(request({ status: "reviewing" }), { params: Promise.resolve({ requestId: "not-a-uuid" }) });

    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin JSON mutation before it can call the workflow RPC", async () => {
    const rpc = vi.fn();
    supabase.createClient.mockResolvedValue(client({ rpc }));

    const response = await POST(request({ status: "reviewing" }, { origin: "https://attacker.example" }), { params });

    expect(response.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("does not trust caller-supplied forwarded origin headers", async () => {
    const rpc = vi.fn(async () => ({ data: [{ request_id: requestId, status: "reviewing" }], error: null }));
    supabase.createClient.mockResolvedValue(client({ rpc }));
    const forwardedRequest = new Request(`http://internal:3000/api/admin/estimates/${requestId}/status`, {
      body: JSON.stringify({ status: "reviewing" }),
      headers: {
        "content-type": "application/json",
        origin: "https://admin.nasora.example",
        "x-forwarded-host": "admin.nasora.example",
        "x-forwarded-proto": "https",
      },
      method: "POST",
    });

    const response = await POST(forwardedRequest, { params });

    expect(response.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("requires an explicit application/json content type", async () => {
    const rpc = vi.fn();
    supabase.createClient.mockResolvedValue(client({ rpc }));

    const response = await POST(request({ status: "reviewing" }, { "content-type": "text/plain" }), { params });

    expect(response.status).toBe(415);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects parameterized JSON media types", async () => {
    const rpc = vi.fn();
    supabase.createClient.mockResolvedValue(client({ rpc }));
    const response = await POST(request({ status: "reviewing" }, { "content-type": "application/json; charset=utf-8" }), { params });
    expect(response.status).toBe(415);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a request with no content type", async () => {
    const rpc = vi.fn();
    supabase.createClient.mockResolvedValue(client({ rpc }));
    const noContentType = new Request(`http://localhost/api/admin/estimates/${requestId}/status`, {
      body: JSON.stringify({ status: "reviewing" }),
      headers: { origin: "http://localhost" },
      method: "POST",
    });

    const response = await POST(noContentType, { params });

    expect(response.status).toBe(415);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated request", async () => {
    supabase.createClient.mockResolvedValue(client({ user: null }));

    const response = await POST(request({ status: "reviewing" }), { params });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required" });
  });

  it("rejects a non-admin session before it can call the workflow RPC", async () => {
    const rpc = vi.fn();
    supabase.createClient.mockResolvedValue(client({ role: "member", rpc }));

    const response = await POST(request({ status: "reviewing" }), { params });

    expect(response.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("requires a meaningful decline reason", async () => {
    const rpc = vi.fn();
    supabase.createClient.mockResolvedValue(client({ rpc }));

    const response = await POST(request({ reason: "   ", status: "declined" }), { params });

    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns a conflict for a rejected lifecycle transition", async () => {
    supabase.createClient.mockResolvedValue(client({
      rpc: vi.fn(async () => ({ data: null, error: { message: "invalid_request_transition" } })),
    }));

    const response = await POST(request({ status: "reviewing" }), { params });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Request status can no longer be changed" });
  });

  it("executes the guarded RPC, which atomically changes status and writes an audit log", async () => {
    const rpc = vi.fn(async () => ({ data: [{ request_id: requestId, status: "declined" }], error: null }));
    supabase.createClient.mockResolvedValue(client({ rpc }));

    const response = await POST(request({ reason: "Outside current scope", status: "declined" }), { params });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ requestId, status: "declined" });
    expect(rpc).toHaveBeenCalledWith("admin_transition_commission_request", {
      p_reason: "Outside current scope",
      p_request_id: requestId,
      p_status: "declined",
    });
  });
});

import { describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/shared/supabase/server", () => supabase);

import { POST } from "@/app/api/admin/estimates/[requestId]/status/route";

const params = Promise.resolve({ requestId: "request-1" });

function request(body: unknown) {
  return new Request("http://localhost/api/admin/estimates/request-1/status", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
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
    const rpc = vi.fn(async () => ({ data: [{ request_id: "request-1", status: "declined" }], error: null }));
    supabase.createClient.mockResolvedValue(client({ rpc }));

    const response = await POST(request({ reason: "Outside current scope", status: "declined" }), { params });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ requestId: "request-1", status: "declined" });
    expect(rpc).toHaveBeenCalledWith("admin_transition_commission_request", {
      p_reason: "Outside current scope",
      p_request_id: "request-1",
      p_status: "declined",
    });
  });
});

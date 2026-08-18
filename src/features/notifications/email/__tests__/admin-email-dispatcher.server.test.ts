import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/shared/supabase/service-role-client.server", () => ({
  createServiceRoleClient: () => ({ rpc }),
}));

import { dispatchAdminEmailBatch } from "../admin-email-dispatcher.server";

const environment = {
  ADMIN_EMAIL_SENDER: "notifications@nasora.example",
  RESEND_API_KEY: "re_test",
};

describe("Resend administrator email dispatcher", () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc
      .mockResolvedValueOnce({
        data: [{
          attempts: 1,
          event_type: "new_estimate",
          id: "00000000-0000-4000-8000-000000000123",
          payload: { request_id: "REQ-001" },
          recipient: "nasora.nsr300@gmail.com",
        }],
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: null });
  });

  it("sends a bounded outbox item through Resend with an idempotency key", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "email-1" }), { status: 200 }));

    await expect(dispatchAdminEmailBatch(environment, fetcher)).resolves.toEqual({ failed: 0, sent: 1 });
    expect(fetcher).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({
      headers: expect.objectContaining({
        authorization: "Bearer re_test",
        "idempotency-key": "admin-email/00000000-0000-4000-8000-000000000123",
      }),
      method: "POST",
    }));
    expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string)).toMatchObject({
      from: "Nasora Studio <notifications@nasora.example>",
      to: ["nasora.nsr300@gmail.com"],
    });
    expect(rpc).toHaveBeenLastCalledWith("complete_admin_email", {
      p_error: null,
      p_id: "00000000-0000-4000-8000-000000000123",
      p_sent: true,
    });
  });

  it("records the Resend status when delivery fails", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 429 }));

    await expect(dispatchAdminEmailBatch(environment, fetcher)).resolves.toEqual({ failed: 1, sent: 0 });
    expect(rpc).toHaveBeenLastCalledWith("complete_admin_email", {
      p_error: "resend_429",
      p_id: "00000000-0000-4000-8000-000000000123",
      p_sent: false,
    });
  });
});

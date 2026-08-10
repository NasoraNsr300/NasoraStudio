import { afterEach, describe, expect, it, vi } from "vitest";

const email = vi.hoisted(() => ({ dispatchAdminEmailBatch: vi.fn() }));
vi.mock("@/features/notifications/email/admin-email-dispatcher.server", () => email);

import { POST } from "@/app/api/internal/email-outbox/dispatch/route";

describe("admin email outbox dispatcher", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

  it("requires cron authorization and dispatches a bounded batch", async () => {
    vi.stubEnv("CRON_SECRET", "cron-test");
    const denied = await POST(new Request("http://localhost/api/internal/email-outbox/dispatch", { method: "POST" }));
    expect(denied.status).toBe(401);

    email.dispatchAdminEmailBatch.mockResolvedValue({ failed: 0, sent: 2 });
    const accepted = await POST(new Request("http://localhost/api/internal/email-outbox/dispatch", { headers: { authorization: "Bearer cron-test" }, method: "POST" }));
    expect(accepted.status).toBe(200);
    await expect(accepted.json()).resolves.toEqual({ failed: 0, sent: 2 });
  });
});

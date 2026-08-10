import { describe, expect, it, vi } from "vitest";

import { runMaintenance } from "../../workers/nasora-maintenance";

describe("Nasora maintenance Worker", () => {
  it("dispatches email and cleanup with the shared cron secret", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    await runMaintenance({ CRON_SECRET: "cron-secret", NASORA_BASE_URL: "https://nasora.example" }, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenCalledWith("https://nasora.example/api/internal/email-outbox/dispatch", expect.objectContaining({ headers: { authorization: "Bearer cron-secret" }, method: "POST" }));
    expect(fetcher).toHaveBeenCalledWith("https://nasora.example/api/internal/cleanup/dispatch", expect.objectContaining({ headers: { authorization: "Bearer cron-secret" }, method: "POST" }));
  });

  it("rejects non-HTTPS origins and failed endpoints", async () => {
    await expect(runMaintenance({ CRON_SECRET: "secret", NASORA_BASE_URL: "http://nasora.example" })).rejects.toThrow("invalid_maintenance_environment");
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    await expect(runMaintenance({ CRON_SECRET: "secret", NASORA_BASE_URL: "https://nasora.example" }, fetcher)).rejects.toThrow("maintenance_request_failed");
  });

  it("keeps cleanup healthy while email delivery is not configured", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    await expect(runMaintenance({ CRON_SECRET: "secret", NASORA_BASE_URL: "https://nasora.example" }, fetcher)).resolves.toBeUndefined();
  });
});

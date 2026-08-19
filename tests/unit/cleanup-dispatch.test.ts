import { afterEach, describe, expect, it, vi } from "vitest";

const cleanup = vi.hoisted(() => ({ processCollaborationCleanup: vi.fn() }));
vi.mock("@/features/collaboration/cleanup/collaboration-cleanup.server", () => cleanup);

import { GET, POST } from "@/app/api/internal/cleanup/dispatch/route";

describe("collaboration cleanup dispatcher", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

  it.each([
    ["POST", POST],
    ["GET", GET],
  ])("protects %s requests with the cron secret", async (_method, handler) => {
    vi.stubEnv("CRON_SECRET", "cron-test");
    const denied = await handler(new Request("http://localhost/api/internal/cleanup/dispatch"));
    expect(denied.status).toBe(401);

    cleanup.processCollaborationCleanup.mockResolvedValue({ completed: 2, failed: 0 });
    const accepted = await handler(new Request("http://localhost/api/internal/cleanup/dispatch", {
      headers: { authorization: "Bearer cron-test" },
    }));
    expect(accepted.status).toBe(200);
    await expect(accepted.json()).resolves.toEqual({ completed: 2, failed: 0 });
  });
});

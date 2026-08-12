import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({ markAdminConversationRead: vi.fn(), markAdminNotificationsRead: vi.fn() }));
vi.mock("@/features/admin/notifications/data/admin-notification-repository.server", () => repository);
import { POST } from "@/app/api/admin/notifications/read/route";

function request(body: unknown, origin = "http://localhost") {
  return new Request("http://localhost/api/admin/notifications/read", { body: JSON.stringify(body), headers: { "content-type": "application/json", origin }, method: "POST" });
}
beforeEach(() => vi.clearAllMocks());

describe("Admin notification read route", () => {
  it("marks displayed source keys read", async () => {
    const response = await POST(request({ notificationIds: ["estimate:00000000-0000-4000-8000-000000000001"] }));
    expect(response.status).toBe(200);
    expect(repository.markAdminNotificationsRead).toHaveBeenCalledOnce();
  });
  it("marks one conversation read and rejects cross-origin", async () => {
    expect((await POST(request({ conversationId: "00000000-0000-4000-8000-000000000001" }))).status).toBe(200);
    expect(repository.markAdminConversationRead).toHaveBeenCalledOnce();
    expect((await POST(request({ conversationId: "00000000-0000-4000-8000-000000000001" }, "https://evil.example"))).status).toBe(403);
  });
});

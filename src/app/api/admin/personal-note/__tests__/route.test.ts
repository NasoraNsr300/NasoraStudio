import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({ saveAdminPersonalNote: vi.fn() }));
const cache = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/site-settings/data/admin-site-settings-repository.server", () => repository);
vi.mock("next/cache", () => cache);

import { POST } from "@/app/api/admin/personal-note/route";

function request(body: unknown, origin = "http://localhost") {
  return new Request("http://localhost/api/admin/personal-note", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", origin },
    method: "POST",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  repository.saveAdminPersonalNote.mockResolvedValue({ adminNote: "เตรียมคิว" });
});

describe("Admin personal note route", () => {
  it("saves a bounded note and revalidates Dashboard", async () => {
    const response = await POST(request({ note: "เตรียมคิว" }));
    expect(response.status).toBe(200);
    expect(repository.saveAdminPersonalNote).toHaveBeenCalledWith("เตรียมคิว");
    expect(cache.revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("rejects cross-origin and oversized input", async () => {
    expect((await POST(request({ note: "x" }, "https://evil.example"))).status).toBe(403);
    expect((await POST(request({ note: "x".repeat(2001) }))).status).toBe(400);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const persist = vi.fn();
vi.mock("@/features/member/server/persist-member-avatar.server", () => ({ persistMemberAvatar: (...args: unknown[]) => persist(...args) }));
vi.mock("@/features/member/data/member-avatar-repository.server", () => ({ finalizeMemberAvatar: vi.fn() }));
vi.mock("@/features/collaboration/storage/r2-private-assets.server", () => ({ createR2PrivateAssetsStorage: vi.fn(() => ({})) }));

import { POST } from "../route";

function request(file: File, origin = "http://localhost") {
  const form = { get: (key: string) => key === "file" ? file : null } as unknown as FormData;
  return { formData: async () => form, headers: new Headers({ "content-type": "multipart/form-data; boundary=test", origin }), url: "http://localhost/api/member/profile/avatar" } as Request;
}

beforeEach(() => { vi.clearAllMocks(); persist.mockResolvedValue({ avatarMediaId: "00000000-0000-4000-8000-000000000202", avatarUrl: "/api/member/profile/avatar/00000000-0000-4000-8000-000000000202" }); });

describe("member avatar upload route", () => {
  it("accepts same-origin multipart and returns no storage key", async () => {
    const response = await POST(request(new File(["webp"], "avatar.webp", { type: "image/webp" })));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ avatarMediaId: "00000000-0000-4000-8000-000000000202", avatarUrl: "/api/member/profile/avatar/00000000-0000-4000-8000-000000000202" });
  });

  it("rejects cross-origin and oversized payloads before persistence", async () => {
    expect((await POST(request(new File(["x"], "avatar.webp", { type: "image/webp" }), "https://evil.test"))).status).toBe(403);
    const huge = { arrayBuffer: async () => new ArrayBuffer(0), name: "huge.webp", size: 5 * 1024 * 1024 + 1, type: "image/webp" } as File;
    const form = { get: () => huge } as unknown as FormData;
    const req = { formData: async () => form, headers: new Headers({ "content-type": "multipart/form-data; boundary=x", origin: "http://localhost" }), url: "http://localhost/api/member/profile/avatar" } as Request;
    expect((await POST(req)).status).toBe(413);
    expect(persist).not.toHaveBeenCalled();
  });
});

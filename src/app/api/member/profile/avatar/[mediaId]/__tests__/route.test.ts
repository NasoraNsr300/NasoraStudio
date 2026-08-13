import { beforeEach, describe, expect, it, vi } from "vitest";

const getObject = vi.fn(); const serve = vi.fn();
vi.mock("@/features/member/data/member-avatar-repository.server", () => ({ getMemberAvatarObject: (...args: unknown[]) => getObject(...args) }));
vi.mock("@/features/media/server/serve-r2-image.server", () => ({ serveR2Image: (...args: unknown[]) => serve(...args) }));

import { GET } from "../route";

beforeEach(() => { vi.clearAllMocks(); getObject.mockResolvedValue({ contentType: "image/webp", objectKey: "member-avatars/id.webp" }); serve.mockResolvedValue(new Response("image", { status: 200 })); });

describe("member avatar media route", () => {
  it("resolves the owner object and serves it privately", async () => {
    const response = await GET(new Request("http://localhost/api/member/profile/avatar/id"), { params: Promise.resolve({ mediaId: "00000000-0000-4000-8000-000000000202" }) });
    expect(response.status).toBe(200);
    expect(serve).toHaveBeenCalledWith("member-avatars/id.webp", "image/webp", "private, max-age=300, must-revalidate");
  });

  it("hides invalid and unauthorized ids", async () => {
    expect((await GET(new Request("http://localhost"), { params: Promise.resolve({ mediaId: "bad" }) })).status).toBe(404);
    getObject.mockRejectedValue(new Error("Authentication required"));
    expect((await GET(new Request("http://localhost"), { params: Promise.resolve({ mediaId: "00000000-0000-4000-8000-000000000202" }) })).status).toBe(404);
  });
});

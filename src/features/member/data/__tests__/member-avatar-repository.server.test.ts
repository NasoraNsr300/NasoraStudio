import { beforeEach, describe, expect, it, vi } from "vitest";

const userClient = { auth: { getUser: vi.fn() } };
const gateway = { rpc: vi.fn() };

vi.mock("@/shared/supabase/server", () => ({ createClient: async () => userClient }));
vi.mock("@/shared/supabase/service-role-client.server", () => ({ createServiceRoleClient: () => gateway }));

import { finalizeMemberAvatar, getMemberAvatarObject } from "../member-avatar-repository.server";

beforeEach(() => {
  vi.clearAllMocks();
  userClient.auth.getUser.mockResolvedValue({ data: { user: { id: "00000000-0000-4000-8000-000000000101" } }, error: null });
});

describe("member avatar server repository", () => {
  it("authenticates and finalizes for the session user only", async () => {
    gateway.rpc.mockResolvedValue({ data: "00000000-0000-4000-8000-000000000202", error: null });
    await expect(finalizeMemberAvatar({ etag: "etag", mediaId: "00000000-0000-4000-8000-000000000202", objectKey: "member-avatars/00000000-0000-4000-8000-000000000202.webp", sizeBytes: 500 })).resolves.toEqual({ mediaId: "00000000-0000-4000-8000-000000000202", userId: "00000000-0000-4000-8000-000000000101" });
    expect(gateway.rpc).toHaveBeenCalledWith("gateway_finalize_profile_avatar", expect.objectContaining({ p_user_id: "00000000-0000-4000-8000-000000000101" }));
  });

  it("returns only the current owner object metadata", async () => {
    gateway.rpc.mockResolvedValue({ data: [{ content_type: "image/webp", etag: "etag", object_key: "member-avatars/00000000-0000-4000-8000-000000000202.webp", size_bytes: 500 }], error: null });
    await expect(getMemberAvatarObject("00000000-0000-4000-8000-000000000202")).resolves.toEqual({ contentType: "image/webp", etag: "etag", objectKey: "member-avatars/00000000-0000-4000-8000-000000000202.webp", sizeBytes: 500 });
  });

  it("rejects unauthenticated requests before using the service gateway", async () => {
    userClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(getMemberAvatarObject("00000000-0000-4000-8000-000000000202")).rejects.toThrow("Authentication required");
    expect(gateway.rpc).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";

import { persistMemberAvatar } from "../persist-member-avatar.server";

function webp512() {
  const bytes = new Uint8Array(30);
  bytes.set([82, 73, 70, 70], 0); bytes.set([87, 69, 66, 80, 86, 80, 56, 88], 8);
  bytes[24] = 255; bytes[25] = 1; bytes[27] = 255; bytes[28] = 1;
  return bytes;
}

describe("persistMemberAvatar", () => {
  it("uploads, confirms metadata, and finalizes with an opaque id", async () => {
    const bytes = webp512();
    const storage = { deleteObject: vi.fn(), headObject: vi.fn(async () => ({ contentType: "image/webp", etag: "etag", sizeBytes: bytes.length })), putImage: vi.fn(async () => ({ contentType: "image/webp", etag: "etag" })) };
    const finalize = vi.fn(async (input) => ({ mediaId: input.mediaId, userId: "user" }));
    const result = await persistMemberAvatar({ file: new File([bytes], "avatar.webp", { type: "image/webp" }), finalize, storage });
    expect(result.mediaId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.avatarUrl).toBe(`/api/member/profile/avatar/${result.mediaId}`);
    expect(finalize).toHaveBeenCalledWith(expect.objectContaining({ objectKey: `member-avatars/${result.mediaId}.webp` }));
  });

  it("deletes an orphan if finalization fails", async () => {
    const bytes = webp512();
    const storage = { deleteObject: vi.fn(async () => undefined), headObject: vi.fn(async () => ({ contentType: "image/webp", etag: "etag", sizeBytes: bytes.length })), putImage: vi.fn(async () => ({ contentType: "image/webp", etag: "etag" })) };
    await expect(persistMemberAvatar({ file: new File([bytes], "avatar.webp", { type: "image/webp" }), finalize: vi.fn(async () => { throw new Error("db"); }), storage })).rejects.toThrow("db");
    expect(storage.deleteObject).toHaveBeenCalledWith(expect.stringMatching(/^member-avatars\/.*\.webp$/));
  });
});

import { describe, expect, it } from "vitest";

import { avatarMediaUrl, centeredSquareCrop, inspectMemberAvatar } from "../member-avatar";

function webp(width: number, height: number) {
  const bytes = new Uint8Array(30);
  bytes.set([82, 73, 70, 70], 0);
  bytes.set([87, 69, 66, 80, 86, 80, 56, 88], 8);
  const adjustedWidth = width - 1;
  const adjustedHeight = height - 1;
  bytes[24] = adjustedWidth & 255;
  bytes[25] = (adjustedWidth >> 8) & 255;
  bytes[26] = (adjustedWidth >> 16) & 255;
  bytes[27] = adjustedHeight & 255;
  bytes[28] = (adjustedHeight >> 8) & 255;
  bytes[29] = (adjustedHeight >> 16) & 255;
  return bytes;
}

describe("member avatar domain", () => {
  it("calculates a centered square crop", () => {
    expect(centeredSquareCrop(1600, 900)).toEqual({ height: 900, width: 900, x: 350, y: 0 });
    expect(centeredSquareCrop(800, 1200)).toEqual({ height: 800, width: 800, x: 0, y: 200 });
    expect(centeredSquareCrop(512, 512)).toEqual({ height: 512, width: 512, x: 0, y: 0 });
  });

  it("projects only an opaque media id into a same-origin URL", () => {
    expect(avatarMediaUrl("00000000-0000-4000-8000-000000000123")).toBe("/api/member/profile/avatar/00000000-0000-4000-8000-000000000123");
    expect(avatarMediaUrl(null)).toBeNull();
  });

  it("accepts only an exact 512 square WebP", async () => {
    const valid = webp(512, 512);
    await expect(inspectMemberAvatar(new File([valid], "avatar.webp", { type: "image/webp" }))).resolves.toMatchObject({ height: 512, width: 512 });
    await expect(inspectMemberAvatar(new File([webp(511, 512)], "avatar.webp", { type: "image/webp" }))).rejects.toThrow("invalid_member_avatar");
    await expect(inspectMemberAvatar(new File([valid], "avatar.png", { type: "image/png" }))).rejects.toThrow("invalid_member_avatar");
  });
});

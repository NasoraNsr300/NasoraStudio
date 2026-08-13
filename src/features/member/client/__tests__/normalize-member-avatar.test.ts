import { afterEach, describe, expect, it, vi } from "vitest";

import { normalizeMemberAvatar } from "../normalize-member-avatar";

function webp512() {
  const bytes = new Uint8Array(30);
  bytes.set([82, 73, 70, 70], 0);
  bytes.set([87, 69, 66, 80, 86, 80, 56, 88], 8);
  bytes[24] = 255;
  bytes[25] = 1;
  bytes[27] = 255;
  bytes[28] = 1;
  return new Blob([bytes], { type: "image/webp" });
}

afterEach(() => vi.unstubAllGlobals());

describe("normalizeMemberAvatar", () => {
  it("center crops and exports an exact WebP derivative", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ close, height: 900, width: 1600 })));
    const drawImage = vi.fn();
    const convertToBlob = vi.fn(async () => webp512());
    vi.stubGlobal("OffscreenCanvas", class {
      constructor(public width: number, public height: number) {}
      getContext() { return { drawImage }; }
      convertToBlob = convertToBlob;
    });

    const source = new File([new Uint8Array([1])], "source.png", { type: "image/png" });
    const result = await normalizeMemberAvatar(source);

    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 350, 0, 900, 900, 0, 0, 512, 512);
    expect(convertToBlob).toHaveBeenCalledWith({ quality: 0.86, type: "image/webp" });
    expect(result.file.name).toBe("avatar.webp");
    expect(result.file.type).toBe("image/webp");
    expect(close).toHaveBeenCalled();
  });

  it("rejects unsupported and oversized source files before decoding", async () => {
    const decode = vi.fn();
    vi.stubGlobal("createImageBitmap", decode);
    await expect(normalizeMemberAvatar(new File(["x"], "bad.gif", { type: "image/gif" }))).rejects.toThrow("invalid_member_avatar_source");
    await expect(normalizeMemberAvatar({ name: "huge.png", size: 5 * 1024 * 1024 + 1, type: "image/png" } as File)).rejects.toThrow("invalid_member_avatar_source");
    expect(decode).not.toHaveBeenCalled();
  });
});

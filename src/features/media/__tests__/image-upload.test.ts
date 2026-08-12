import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { normalizeImageForUpload } from "@/features/media/client/normalize-image-for-upload";
import { inspectImageUpload } from "@/features/media/domain/image-upload";
import { persistR2Image } from "@/features/media/server/persist-r2-image.server";

function png(width: number, height: number) {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([0, 0, 0, 13, 73, 72, 68, 82], 8);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
}

function webp(width: number, height: number) {
  const bytes = new Uint8Array(30);
  bytes.set(new TextEncoder().encode("RIFF"), 0);
  bytes.set(new TextEncoder().encode("WEBP"), 8);
  bytes.set(new TextEncoder().encode("VP8X"), 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(4, bytes.length - 8, true);
  const storedWidth = width - 1;
  const storedHeight = height - 1;
  bytes.set([storedWidth & 255, (storedWidth >> 8) & 255, (storedWidth >> 16) & 255], 24);
  bytes.set([storedHeight & 255, (storedHeight >> 8) & 255, (storedHeight >> 16) & 255], 27);
  return bytes;
}

describe("display image inspection", () => {
  it("reads dimensions from magic bytes instead of trusting form fields", async () => {
    const file = new File([png(1600, 900)], "cover.png", { type: "image/png" });
    await expect(inspectImageUpload(file)).resolves.toEqual({
      contentType: "image/png",
      height: 900,
      sizeBytes: 24,
      width: 1600,
    });
  });

  it("rejects a MIME/signature mismatch and oversized dimensions", async () => {
    await expect(inspectImageUpload(new File([png(100, 100)], "fake.webp", { type: "image/webp" })))
      .rejects.toThrow("invalid_image");
    await expect(inspectImageUpload(new File([png(20_001, 100)], "wide.png", { type: "image/png" })))
      .rejects.toThrow("invalid_image");
  });

  it("accepts lossy VP8 and lossless VP8L canvas output", async () => {
    const lossy = new Uint8Array(30);
    lossy.set(new TextEncoder().encode("RIFF"), 0); lossy.set(new TextEncoder().encode("WEBPVP8 "), 8);
    lossy.set([0x9d, 0x01, 0x2a, 0xb0, 0x04, 0x84, 0x03], 23);
    const lossless = new Uint8Array(25);
    lossless.set(new TextEncoder().encode("RIFF"), 0); lossless.set(new TextEncoder().encode("WEBPVP8L"), 8); lossless[20] = 0x2f;
    const packed = ((900 - 1) << 14) | (1200 - 1);
    new DataView(lossless.buffer).setUint32(21, packed, true);
    await expect(inspectImageUpload(new File([lossy], "lossy.webp", { type: "image/webp" }))).resolves.toMatchObject({ height: 900, width: 1200 });
    await expect(inspectImageUpload(new File([lossless], "lossless.webp", { type: "image/webp" }))).resolves.toMatchObject({ height: 900, width: 1200 });
  });

  it("inspects a real workspace image without modifying it", async () => {
    const path = join(process.cwd(), "..", "..", "Img", "615926480_1367631994643508_5264380239726292867_n.jpg");
    const bytes = await readFile(path);
    await expect(inspectImageUpload(new File([bytes], "workspace.jpg", { type: "image/jpeg" })))
      .resolves.toMatchObject({ contentType: "image/jpeg" });
  });
});

describe("browser WebP normalization", () => {
  it("converts PNG in the browser and caps the longest edge at 4096", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ close, height: 4000, width: 8000 })));
    const drawImage = vi.fn();
    vi.stubGlobal("OffscreenCanvas", class {
      constructor(public width: number, public height: number) {}
      convertToBlob = vi.fn(async () => new Blob([webp(this.width, this.height)], { type: "image/webp" }));
      getContext = vi.fn(() => ({ drawImage }));
    });

    const result = await normalizeImageForUpload(new File([png(8000, 4000)], "large.png", { type: "image/png" }));

    expect(result).toEqual(expect.objectContaining({ contentType: "image/webp", height: 2048, width: 4096 }));
    expect(result.file.name).toBe("large.webp");
    expect(result.file.type).toBe("image/webp");
    expect(drawImage).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });
});

describe("durable R2 image persistence", () => {
  it("HEAD-confirms bytes before registering permanent metadata", async () => {
    const file = new File([webp(1200, 900)], "work.webp", { type: "image/webp" });
    const register = vi.fn(async () => "media-id");
    const storage = {
      deleteObject: vi.fn(),
      headObject: vi.fn(async () => ({ contentType: "image/webp", etag: "etag-1", sizeBytes: file.size })),
      putImage: vi.fn(async () => ({ contentType: "image/webp", etag: "etag-1" })),
    };

    await expect(persistR2Image({ file, prefix: "portfolio", register, storage })).resolves.toEqual({
      contentType: "image/webp",
      etag: "etag-1",
      height: 900,
      mediaId: "media-id",
      objectKey: expect.stringMatching(/^portfolio\/[0-9a-f-]{36}\.webp$/),
      sizeBytes: file.size,
      width: 1200,
    });
    expect(storage.headObject).toHaveBeenCalledBefore(register);
  });

  it("deletes an object when HEAD metadata does not match", async () => {
    const file = new File([webp(1200, 900)], "work.webp", { type: "image/webp" });
    const storage = {
      deleteObject: vi.fn(async () => undefined),
      headObject: vi.fn(async () => ({ contentType: "image/webp", etag: "other", sizeBytes: file.size })),
      putImage: vi.fn(async () => ({ contentType: "image/webp", etag: "etag-1" })),
    };

    await expect(persistR2Image({ file, prefix: "portfolio", register: vi.fn(), storage }))
      .rejects.toThrow("r2_metadata_mismatch");
    expect(storage.deleteObject).toHaveBeenCalledWith(expect.stringMatching(/^portfolio\//));
  });
});

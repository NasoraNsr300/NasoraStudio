import "server-only";

import { randomUUID } from "node:crypto";

import { createR2PrivateAssetsStorage, PRIVATE_ASSET_LIMITS } from "./r2-private-assets.server";

const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function uploadPrivateImage(file: File, prefix: "message-images" | "progress-images") {
  if (file.size < 1 || file.size > PRIVATE_ASSET_LIMITS.imageBytes || !extensions[file.type]) throw new Error("invalid_image");
  const objectKey = `${prefix}/${randomUUID()}.${extensions[file.type]}`;
  const storage = createR2PrivateAssetsStorage();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { contentType, etag } = await storage.putImage(objectKey, bytes, file.type);
  return { cleanup: () => storage.deleteObject(objectKey), image: { contentType, etag, objectKey, sizeBytes: file.size } };
}

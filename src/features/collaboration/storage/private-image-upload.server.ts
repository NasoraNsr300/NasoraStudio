import "server-only";

import { randomUUID } from "node:crypto";

import { inspectImageUpload } from "@/features/media/domain/image-upload";
import { createR2PrivateAssetsStorage } from "./r2-private-assets.server";

export async function uploadPrivateImage(file: File, prefix: "message-images" | "progress-images") {
  const inspected = await inspectImageUpload(file);
  if (inspected.contentType !== "image/webp") throw new Error("invalid_image");
  const objectKey = `${prefix}/${randomUUID()}.webp`;
  const storage = createR2PrivateAssetsStorage();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { contentType, etag } = await storage.putImage(objectKey, bytes, file.type);
  return { cleanup: () => storage.deleteObject(objectKey), image: { contentType, etag, objectKey, sizeBytes: file.size } };
}

import "server-only";

import { randomUUID } from "node:crypto";

import { inspectImageUpload } from "@/features/media/domain/image-upload";

type ImageStorage = {
  deleteObject(objectKey: string): Promise<void>;
  headObject(objectKey: string): Promise<{ contentType: string; etag: string; sizeBytes: number } | null>;
  putImage(objectKey: string, bytes: Uint8Array, declaredContentType: string): Promise<{ contentType: string; etag: string }>;
};

export async function persistR2Image({ file, prefix, register, storage }: {
  file: File;
  prefix: "catalog-covers" | "document-covers" | "portfolio";
  register(input: { contentType: "image/webp"; etag: string; height: number; objectKey: string; width: number }): Promise<string>;
  storage: ImageStorage;
}) {
  const inspected = await inspectImageUpload(file);
  if (inspected.contentType !== "image/webp") throw new Error("display_image_must_be_webp");
  const objectKey = `${prefix}/${randomUUID()}.webp`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const uploaded = await storage.putImage(objectKey, bytes, inspected.contentType);
  try {
    const confirmed = await storage.headObject(objectKey);
    if (!confirmed || confirmed.etag !== uploaded.etag || confirmed.contentType !== inspected.contentType || confirmed.sizeBytes !== inspected.sizeBytes) {
      throw new Error("r2_metadata_mismatch");
    }
    const mediaId = await register({
      contentType: inspected.contentType,
      etag: confirmed.etag,
      height: inspected.height,
      objectKey,
      width: inspected.width,
    });
    return { ...inspected, etag: confirmed.etag, mediaId, objectKey };
  } catch (error) {
    await storage.deleteObject(objectKey).catch(() => undefined);
    throw error;
  }
}

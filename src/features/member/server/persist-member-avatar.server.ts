import "server-only";

import { randomUUID } from "node:crypto";

import { avatarMediaUrl, inspectMemberAvatar } from "@/features/member/domain/member-avatar";

type Storage = {
  deleteObject(objectKey: string): Promise<void>;
  headObject(objectKey: string): Promise<{ contentType: string; etag: string; sizeBytes: number } | null>;
  putImage(objectKey: string, bytes: Uint8Array, declaredContentType: string): Promise<{ contentType: string; etag: string }>;
};

export async function persistMemberAvatar({ file, finalize, storage }: {
  file: File;
  finalize(input: { etag: string; mediaId: string; objectKey: string; sizeBytes: number }): Promise<{ mediaId: string; userId: string }>;
  storage: Storage;
}) {
  const inspected = await inspectMemberAvatar(file);
  const mediaId = randomUUID();
  const objectKey = `member-avatars/${mediaId}.webp`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const uploaded = await storage.putImage(objectKey, bytes, inspected.contentType);
  try {
    const confirmed = await storage.headObject(objectKey);
    if (!confirmed || confirmed.etag !== uploaded.etag || confirmed.contentType !== "image/webp" || confirmed.sizeBytes !== bytes.byteLength) throw new Error("r2_metadata_mismatch");
    const finalized = await finalize({ etag: confirmed.etag, mediaId, objectKey, sizeBytes: confirmed.sizeBytes });
    return { avatarMediaId: finalized.mediaId, avatarUrl: avatarMediaUrl(finalized.mediaId), mediaId: finalized.mediaId };
  } catch (error) {
    await storage.deleteObject(objectKey).catch(() => undefined);
    throw error;
  }
}

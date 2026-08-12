import "server-only";

import { createR2PrivateAssetsStorage } from "@/features/collaboration/storage/r2-private-assets.server";

export async function serveR2Image(objectKey: string, expectedContentType?: string, cacheControl = "public, max-age=31536000, immutable") {
  const object = await createR2PrivateAssetsStorage().getObject(objectKey);
  if (!object || (expectedContentType && object.contentType !== expectedContentType) || !object.contentType.startsWith("image/")) {
    return new Response(null, { status: 404 });
  }
  return new Response(object.body, {
    headers: {
      "cache-control": cacheControl,
      "content-length": String(object.sizeBytes),
      "content-type": object.contentType,
      etag: `"${object.etag}"`,
      "x-content-type-options": "nosniff",
    },
    status: 200,
  });
}

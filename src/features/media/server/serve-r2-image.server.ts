import "server-only";

import { createR2PrivateAssetsStorage } from "@/features/collaboration/storage/r2-private-assets.server";

export async function serveR2Image(objectKey: string, expectedContentType: string) {
  const object = await createR2PrivateAssetsStorage().getObject(objectKey);
  if (!object || object.contentType !== expectedContentType || !object.contentType.startsWith("image/")) {
    return new Response(null, { status: 404 });
  }
  return new Response(object.body, {
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
      "content-length": String(object.sizeBytes),
      "content-type": object.contentType,
      etag: `"${object.etag}"`,
      "x-content-type-options": "nosniff",
    },
    status: 200,
  });
}

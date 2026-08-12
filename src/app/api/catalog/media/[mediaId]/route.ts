import { z } from "zod";

import { getPublicCatalogMediaObject } from "@/features/catalog/data/public-catalog-repository.server";
import { serveR2Image } from "@/features/media/server/serve-r2-image.server";

export async function GET(_request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  if (!z.uuid().safeParse(mediaId).success) return new Response(null, { status: 404 });
  try {
    const media = await getPublicCatalogMediaObject(mediaId);
    if (!media) return new Response(null, { status: 404 });
    return await serveR2Image(media.objectKey, media.contentType);
  } catch {
    return new Response(null, { status: 404 });
  }
}

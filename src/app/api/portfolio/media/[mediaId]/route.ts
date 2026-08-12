import { z } from "zod";

import { serveR2Image } from "@/features/media/server/serve-r2-image.server";
import { getPublicPortfolioMediaObject } from "@/features/portfolio/data/public-portfolio-repository.server";

export async function GET(_request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  if (!z.uuid().safeParse(mediaId).success) return new Response(null, { status: 404 });
  try {
    const media = await getPublicPortfolioMediaObject(mediaId);
    if (!media) return new Response(null, { status: 404 });
    return await serveR2Image(media.objectKey, media.contentType);
  } catch {
    return new Response(null, { status: 404 });
  }
}

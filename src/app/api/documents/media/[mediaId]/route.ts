import { z } from "zod";

import { createR2PrivateAssetsStorage } from "@/features/collaboration/storage/r2-private-assets.server";
import { getPublicDocumentCoverObject } from "@/features/documents/data/public-documents-repository.server";

export async function GET(_request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params; if (!z.uuid().safeParse(mediaId).success) return new Response(null, { status: 404 });
  try { const media = await getPublicDocumentCoverObject(mediaId); if (!media) return new Response(null, { status: 404 }); const location = await createR2PrivateAssetsStorage().createDownloadUrl(media.objectKey); return new Response(null, { headers: { "cache-control": "public, max-age=120", location }, status: 307 }); }
  catch { return new Response(null, { status: 404 }); }
}

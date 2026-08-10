import { getMemberMessageAssetKey } from "@/features/collaboration/data/collaboration-repository.server";
import { createR2PrivateAssetsStorage } from "@/features/collaboration/storage/r2-private-assets.server";

export async function GET(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  try { const key = await getMemberMessageAssetKey((await params).assetId); if (!key) return new Response(null, { status: 404 }); return Response.redirect(await createR2PrivateAssetsStorage().createDownloadUrl(key), 307); }
  catch { return new Response(null, { status: 404 }); }
}

import { getMemberMessageAssetKey } from "@/features/collaboration/data/collaboration-repository.server";
import { serveR2Image } from "@/features/media/server/serve-r2-image.server";

export async function GET(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  try { const key = await getMemberMessageAssetKey((await params).assetId); if (!key) return new Response(null, { status: 404 }); return await serveR2Image(key, undefined, "private, no-store"); }
  catch { return new Response(null, { status: 404 }); }
}

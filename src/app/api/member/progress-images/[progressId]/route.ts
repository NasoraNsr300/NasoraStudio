import { getMemberProgressImageKey } from "@/features/collaboration/data/collaboration-repository.server";
import { serveR2Image } from "@/features/media/server/serve-r2-image.server";

export async function GET(_request: Request, { params }: { params: Promise<{ progressId: string }> }) {
  try { const key = await getMemberProgressImageKey((await params).progressId); if (!key) return new Response(null, { status: 404 }); return await serveR2Image(key, undefined, "private, no-store"); }
  catch { return new Response(null, { status: 404 }); }
}

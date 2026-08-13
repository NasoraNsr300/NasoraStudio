import { getMemberAvatarObject } from "@/features/member/data/member-avatar-repository.server";
import { serveR2Image } from "@/features/media/server/serve-r2-image.server";
import { z } from "zod";

export async function GET(_request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  try {
    const mediaId = z.uuid().parse((await params).mediaId);
    const object = await getMemberAvatarObject(mediaId);
    if (!object) return new Response(null, { status: 404 });
    return serveR2Image(object.objectKey, object.contentType, "private, max-age=300, must-revalidate");
  } catch { return new Response(null, { status: 404 }); }
}

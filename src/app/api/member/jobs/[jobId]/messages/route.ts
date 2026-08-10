import { z } from "zod";

import { assertMemberConversation, postMemberJobMessage, postMemberJobMessageWithImage } from "@/features/collaboration/data/collaboration-repository.server";
import { collaborationError, isSameOriginJson } from "@/features/collaboration/http/mutation-security";
import { uploadPrivateImage } from "@/features/collaboration/storage/private-image-upload.server";

const bodySchema = z.object({ body: z.string().trim().min(1).max(4_000) }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  if (!z.uuid().safeParse(jobId).success || request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid request" }, { status: 403 });
  if (isSameOriginJson(request)) {
    const input = bodySchema.safeParse(await request.json().catch(() => null)); if (!input.success) return Response.json({ error: "Invalid message" }, { status: 400 });
    try { return Response.json(await postMemberJobMessage({ body: input.data.body, jobId }), { status: 201 }); } catch (error) { return collaborationError(error, "Unable to send message"); }
  }
  if (request.headers.get("content-type")?.split(";", 1)[0] !== "multipart/form-data") return Response.json({ error: "Invalid message" }, { status: 400 });
  try {
    await assertMemberConversation(jobId); const data = await request.formData(); const body = z.string().trim().min(1).max(4_000).parse(data.get("body")); const file = data.get("image"); if (!(file instanceof File)) throw new Error("invalid_image");
    const uploaded = await uploadPrivateImage(file, "message-images");
    try { return Response.json(await postMemberJobMessageWithImage({ body, image: uploaded.image, jobId }), { status: 201 }); } catch (error) { await uploaded.cleanup().catch(() => undefined); throw error; }
  } catch (error) { return collaborationError(error, "Unable to send message"); }
}

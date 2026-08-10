import { z } from "zod";

import { randomUUID } from "node:crypto";

import { assertCollaborationAdmin, createAdminDelivery, createAdminFileDelivery } from "@/features/collaboration/data/collaboration-repository.server";
import { collaborationError, isSameOriginJson } from "@/features/collaboration/http/mutation-security";
import { createR2PrivateAssetsStorage, PRIVATE_ASSET_LIMITS } from "@/features/collaboration/storage/r2-private-assets.server";

const bodySchema = z.object({
  displayName: z.string().trim().min(1).max(240).default("Google Drive"),
  kind: z.literal("google_drive"),
  url: z.url().startsWith("https://drive.google.com/"),
}).strict();

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  if (!z.uuid().safeParse(jobId).success || request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid request" }, { status: 403 });
  if (isSameOriginJson(request)) {
    const input = bodySchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return Response.json({ error: "Invalid delivery" }, { status: 400 });
    try { return Response.json(await createAdminDelivery({ ...input.data, jobId }), { status: 201 }); }
    catch (error) { return collaborationError(error, "Unable to create delivery"); }
  }
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "multipart/form-data") return Response.json({ error: "Invalid delivery" }, { status: 400 });
  let objectKey = "";
  try {
    await assertCollaborationAdmin();
    const data = await request.formData();
    const file = data.get("file");
    if (!(file instanceof File) || file.size < 1 || file.size > PRIVATE_ASSET_LIMITS.deliveryBytes || !(PRIVATE_ASSET_LIMITS.deliveryTypes as readonly string[]).includes(file.type)) return Response.json({ error: "Invalid delivery file" }, { status: 400 });
    const safeName = file.name.normalize("NFKC").replace(/[^\p{L}\p{N}._ -]+/gu, "-").slice(-160) || "delivery.bin";
    objectKey = `deliveries/${jobId}/${randomUUID()}-${safeName}`;
    const storage = createR2PrivateAssetsStorage();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { etag } = await storage.putDelivery(objectKey, bytes, file.type);
    try {
      const result = await createAdminFileDelivery({ contentType: file.type, displayName: file.name, etag, jobId, objectKey, sizeBytes: file.size });
      return Response.json(result, { status: 201 });
    } catch (error) { await storage.deleteObject(objectKey).catch(() => undefined); throw error; }
  }
  catch (error) { return collaborationError(error, "Unable to create delivery"); }
}

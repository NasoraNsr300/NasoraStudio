import { randomUUID } from "node:crypto";

import { documentMutationError, revalidateDocuments } from "@/features/admin/documents/api/documents-route";
import { createAdminDocumentMedia, listAdminDocuments } from "@/features/admin/documents/data/admin-documents-repository.server";
import { createR2PrivateAssetsStorage, PRIVATE_ASSET_LIMITS } from "@/features/collaboration/storage/r2-private-assets.server";

const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin" }, { status: 403 });
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "multipart/form-data") return Response.json({ error: "Invalid media upload" }, { status: 415 });
  let objectKey = "";
  try {
    await listAdminDocuments();
    const form = await request.formData(); const file = form.get("file");
    const altTh = String(form.get("altTh") ?? "").trim().slice(0, 300); const altEn = String(form.get("altEn") ?? "").trim().slice(0, 300);
    const width = Number(form.get("width")); const height = Number(form.get("height"));
    if (file === null || typeof file === "string" || file.size < 1 || file.size > PRIVATE_ASSET_LIMITS.imageBytes || !extensions[file.type] || !Number.isInteger(width) || width < 1 || width > 20_000 || !Number.isInteger(height) || height < 1 || height > 20_000) return Response.json({ error: "รูปปกไม่ถูกต้อง" }, { status: 400 });
    objectKey = `document-covers/${randomUUID()}.${extensions[file.type]}`;
    const storage = createR2PrivateAssetsStorage(); const { contentType, etag } = await storage.putImage(objectKey, new Uint8Array(await file.arrayBuffer()), file.type);
    try {
      const mediaId = await createAdminDocumentMedia({ alt: { en: altEn, th: altTh }, contentType, etag, height, objectKey, width });
      revalidateDocuments(); return Response.json({ mediaId, src: `/api/documents/media/${mediaId}` }, { status: 201 });
    } catch (error) { await storage.deleteObject(objectKey).catch(() => undefined); throw error; }
  } catch (error) { return documentMutationError(error); }
}

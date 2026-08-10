import { randomUUID } from "node:crypto";

import { assertCatalogAdmin, createAdminCatalogMedia } from "@/features/admin/catalog/data/admin-catalog-repository.server";
import { catalogMutationError, revalidateCommissionCatalog } from "@/features/admin/catalog/api/catalog-route";
import { createR2PrivateAssetsStorage, PRIVATE_ASSET_LIMITS } from "@/features/collaboration/storage/r2-private-assets.server";

const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin" }, { status: 403 });
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "multipart/form-data") return Response.json({ error: "Invalid media upload" }, { status: 415 });
  let objectKey = "";
  try {
    await assertCatalogAdmin();
    const form = await request.formData();
    const file = form.get("file");
    const altTh = String(form.get("altTh") ?? "").trim().slice(0, 300);
    const altEn = String(form.get("altEn") ?? "").trim().slice(0, 300);
    const width = Number(form.get("width"));
    const height = Number(form.get("height"));
    if (file === null || typeof file === "string" || file.size < 1 || file.size > PRIVATE_ASSET_LIMITS.imageBytes || !extensions[file.type]
      || !Number.isInteger(width) || width < 1 || width > 20_000 || !Number.isInteger(height) || height < 1 || height > 20_000) {
      return Response.json({ error: "Invalid catalog image" }, { status: 400 });
    }
    objectKey = `catalog-covers/${randomUUID()}.${extensions[file.type]}`;
    const storage = createR2PrivateAssetsStorage();
    const { contentType, etag } = await storage.putImage(objectKey, new Uint8Array(await file.arrayBuffer()), file.type);
    try {
      const mediaId = await createAdminCatalogMedia({ alt: { en: altEn, th: altTh }, contentType, etag, height, objectKey, width });
      revalidateCommissionCatalog();
      return Response.json({ mediaId, src: `/api/catalog/media/${mediaId}` }, { status: 201 });
    } catch (error) {
      await storage.deleteObject(objectKey).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    return catalogMutationError(error);
  }
}

import { assertCatalogAdmin, createAdminCatalogMedia } from "@/features/admin/catalog/data/admin-catalog-repository.server";
import { catalogMutationError, revalidateCommissionCatalog } from "@/features/admin/catalog/api/catalog-route";
import { createR2PrivateAssetsStorage } from "@/features/collaboration/storage/r2-private-assets.server";
import { persistR2Image } from "@/features/media/server/persist-r2-image.server";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin" }, { status: 403 });
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "multipart/form-data") return Response.json({ error: "Invalid media upload" }, { status: 415 });
  try {
    await assertCatalogAdmin();
    const form = await request.formData();
    const file = form.get("file");
    if (file === null || typeof file === "string") return Response.json({ error: "Invalid catalog image" }, { status: 400 });
    const alt = { en: String(form.get("altEn") ?? "").trim().slice(0, 300), th: String(form.get("altTh") ?? "").trim().slice(0, 300) };
    const result = await persistR2Image({
      file, prefix: "catalog-covers", storage: createR2PrivateAssetsStorage(),
      register: (media) => createAdminCatalogMedia({ ...media, alt }),
    });
    revalidateCommissionCatalog();
    return Response.json({ mediaId: result.mediaId, src: `/api/catalog/media/${result.mediaId}` }, { status: 201 });
  } catch (error) { return catalogMutationError(error); }
}

import { documentMutationError, revalidateDocuments } from "@/features/admin/documents/api/documents-route";
import { createAdminDocumentMedia, listAdminDocuments } from "@/features/admin/documents/data/admin-documents-repository.server";
import { createR2PrivateAssetsStorage } from "@/features/collaboration/storage/r2-private-assets.server";
import { persistR2Image } from "@/features/media/server/persist-r2-image.server";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin" }, { status: 403 });
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "multipart/form-data") return Response.json({ error: "Invalid media upload" }, { status: 415 });
  try {
    await listAdminDocuments();
    const form = await request.formData();
    const file = form.get("file");
    if (file === null || typeof file === "string") return Response.json({ error: "รูปปกไม่ถูกต้อง" }, { status: 400 });
    const alt = { en: String(form.get("altEn") ?? "").trim().slice(0, 300), th: String(form.get("altTh") ?? "").trim().slice(0, 300) };
    const result = await persistR2Image({
      file, prefix: "document-covers", storage: createR2PrivateAssetsStorage(),
      register: (media) => createAdminDocumentMedia({ ...media, alt }),
    });
    revalidateDocuments();
    return Response.json({ mediaId: result.mediaId, src: `/api/documents/media/${result.mediaId}` }, { status: 201 });
  } catch (error) { return documentMutationError(error); }
}

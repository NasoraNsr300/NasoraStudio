import { saveAdminAlbum } from "@/features/admin/catalog/data/admin-catalog-repository.server";
import { albumBodySchema, catalogMutationError, parseCatalogBody, revalidateCommissionCatalog, validateCatalogMutation } from "@/features/admin/catalog/api/catalog-route";

export async function POST(request: Request) {
  const invalid = validateCatalogMutation(request);
  if (invalid) return invalid;
  const parsed = await parseCatalogBody(request, albumBodySchema);
  if (!parsed.success) return Response.json({ error: "ข้อมูลอัลบั้มไม่ถูกต้อง" }, { status: 400 });
  try {
    const albumId = await saveAdminAlbum({ ...parsed.data, id: null });
    revalidateCommissionCatalog(parsed.data.slug);
    return Response.json({ albumId }, { status: 201 });
  } catch (error) {
    return catalogMutationError(error);
  }
}


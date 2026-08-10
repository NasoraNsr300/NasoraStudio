import { saveAdminAlbum } from "@/features/admin/catalog/data/admin-catalog-repository.server";
import { albumBodySchema, catalogMutationError, parseCatalogBody, revalidateCommissionCatalog, uuidSchema, validateCatalogMutation } from "@/features/admin/catalog/api/catalog-route";

export async function PATCH(request: Request, context: { params: Promise<{ albumId: string }> }) {
  const invalid = validateCatalogMutation(request);
  if (invalid) return invalid;
  const { albumId } = await context.params;
  if (!uuidSchema.safeParse(albumId).success) return Response.json({ error: "รหัสอัลบั้มไม่ถูกต้อง" }, { status: 400 });
  const parsed = await parseCatalogBody(request, albumBodySchema);
  if (!parsed.success) return Response.json({ error: "ข้อมูลอัลบั้มไม่ถูกต้อง" }, { status: 400 });
  try {
    await saveAdminAlbum({ ...parsed.data, id: albumId });
    revalidateCommissionCatalog(parsed.data.slug);
    return Response.json({ albumId });
  } catch (error) {
    return catalogMutationError(error);
  }
}


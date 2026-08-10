import { archiveAdminAlbum } from "@/features/admin/catalog/data/admin-catalog-repository.server";
import { archiveBodySchema, catalogMutationError, parseCatalogBody, revalidateCommissionCatalog, uuidSchema, validateCatalogMutation } from "@/features/admin/catalog/api/catalog-route";

export async function POST(request: Request, context: { params: Promise<{ albumId: string }> }) {
  const invalid = validateCatalogMutation(request);
  if (invalid) return invalid;
  const { albumId } = await context.params;
  if (!uuidSchema.safeParse(albumId).success) return Response.json({ error: "รหัสอัลบั้มไม่ถูกต้อง" }, { status: 400 });
  const parsed = await parseCatalogBody(request, archiveBodySchema);
  if (!parsed.success) return Response.json({ error: "ข้อมูลเก็บถาวรไม่ถูกต้อง" }, { status: 400 });
  try {
    await archiveAdminAlbum({ albumId, ...parsed.data });
    revalidateCommissionCatalog();
    return Response.json({ albumId, archived: parsed.data.archived });
  } catch (error) {
    return catalogMutationError(error);
  }
}


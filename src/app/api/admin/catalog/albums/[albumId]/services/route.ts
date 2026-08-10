import { saveAdminService } from "@/features/admin/catalog/data/admin-catalog-repository.server";
import { catalogMutationError, parseCatalogBody, revalidateCommissionCatalog, serviceBodySchema, uuidSchema, validateCatalogMutation } from "@/features/admin/catalog/api/catalog-route";

export async function POST(request: Request, context: { params: Promise<{ albumId: string }> }) {
  const invalid = validateCatalogMutation(request);
  if (invalid) return invalid;
  const { albumId } = await context.params;
  if (!uuidSchema.safeParse(albumId).success) return Response.json({ error: "รหัสอัลบั้มไม่ถูกต้อง" }, { status: 400 });
  const parsed = await parseCatalogBody(request, serviceBodySchema);
  if (!parsed.success) return Response.json({ error: "ข้อมูลรูปแบบย่อยไม่ถูกต้อง" }, { status: 400 });
  try {
    const serviceId = await saveAdminService({ ...parsed.data, albumId, id: null });
    revalidateCommissionCatalog();
    return Response.json({ serviceId }, { status: 201 });
  } catch (error) {
    return catalogMutationError(error);
  }
}


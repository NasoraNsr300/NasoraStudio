import { saveAdminService } from "@/features/admin/catalog/data/admin-catalog-repository.server";
import { catalogMutationError, parseCatalogBody, revalidateCommissionCatalog, serviceUpdateBodySchema, uuidSchema, validateCatalogMutation } from "@/features/admin/catalog/api/catalog-route";

export async function PATCH(request: Request, context: { params: Promise<{ serviceId: string }> }) {
  const invalid = validateCatalogMutation(request);
  if (invalid) return invalid;
  const { serviceId } = await context.params;
  if (!uuidSchema.safeParse(serviceId).success) return Response.json({ error: "รหัสรูปแบบย่อยไม่ถูกต้อง" }, { status: 400 });
  const parsed = await parseCatalogBody(request, serviceUpdateBodySchema);
  if (!parsed.success) return Response.json({ error: "ข้อมูลรูปแบบย่อยไม่ถูกต้อง" }, { status: 400 });
  try {
    await saveAdminService({ ...parsed.data, id: serviceId });
    revalidateCommissionCatalog();
    return Response.json({ serviceId });
  } catch (error) {
    return catalogMutationError(error);
  }
}


import { replaceAdminServicePrices } from "@/features/admin/catalog/data/admin-catalog-repository.server";
import { catalogMutationError, parseCatalogBody, pricesBodySchema, revalidateCommissionCatalog, uuidSchema, validateCatalogMutation } from "@/features/admin/catalog/api/catalog-route";

export async function PUT(request: Request, context: { params: Promise<{ serviceId: string }> }) {
  const invalid = validateCatalogMutation(request);
  if (invalid) return invalid;
  const { serviceId } = await context.params;
  if (!uuidSchema.safeParse(serviceId).success) return Response.json({ error: "รหัสรูปแบบย่อยไม่ถูกต้อง" }, { status: 400 });
  const parsed = await parseCatalogBody(request, pricesBodySchema);
  if (!parsed.success) return Response.json({ error: "ข้อมูลราคาไม่ถูกต้อง" }, { status: 400 });
  try {
    await replaceAdminServicePrices(serviceId, parsed.data.prices);
    revalidateCommissionCatalog();
    return Response.json({ serviceId });
  } catch (error) {
    return catalogMutationError(error);
  }
}

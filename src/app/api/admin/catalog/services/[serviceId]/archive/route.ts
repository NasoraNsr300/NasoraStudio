import { archiveAdminService } from "@/features/admin/catalog/data/admin-catalog-repository.server";
import { archiveBodySchema, catalogMutationError, parseCatalogBody, revalidateCommissionCatalog, uuidSchema, validateCatalogMutation } from "@/features/admin/catalog/api/catalog-route";

export async function POST(request: Request, context: { params: Promise<{ serviceId: string }> }) {
  const invalid = validateCatalogMutation(request);
  if (invalid) return invalid;
  const { serviceId } = await context.params;
  if (!uuidSchema.safeParse(serviceId).success) return Response.json({ error: "รหัสรูปแบบย่อยไม่ถูกต้อง" }, { status: 400 });
  const parsed = await parseCatalogBody(request, archiveBodySchema);
  if (!parsed.success) return Response.json({ error: "ข้อมูลเก็บถาวรไม่ถูกต้อง" }, { status: 400 });
  try {
    await archiveAdminService({ serviceId, ...parsed.data });
    revalidateCommissionCatalog();
    return Response.json({ serviceId, archived: parsed.data.archived });
  } catch (error) {
    return catalogMutationError(error);
  }
}


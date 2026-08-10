import { documentBodySchema, documentMutationError, documentUuidSchema, parseDocumentBody, revalidateDocuments, validateDocumentMutation } from "@/features/admin/documents/api/documents-route";
import { saveAdminDocument } from "@/features/admin/documents/data/admin-documents-repository.server";

export async function PATCH(request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const invalid = validateDocumentMutation(request); if (invalid) return invalid;
  const { documentId } = await params; if (!documentUuidSchema.safeParse(documentId).success) return Response.json({ error: "รหัสเอกสารไม่ถูกต้อง" }, { status: 400 });
  const parsed = await parseDocumentBody(request, documentBodySchema); if (!parsed.success) return Response.json({ error: "ข้อมูลเอกสารไม่ถูกต้อง" }, { status: 400 });
  try { await saveAdminDocument({ ...parsed.data, id: documentId }); revalidateDocuments(parsed.data.slug); return Response.json({ documentId }); }
  catch (error) { return documentMutationError(error); }
}

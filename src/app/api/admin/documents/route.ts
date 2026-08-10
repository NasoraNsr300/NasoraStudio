import { documentBodySchema, documentMutationError, parseDocumentBody, revalidateDocuments, validateDocumentMutation } from "@/features/admin/documents/api/documents-route";
import { saveAdminDocument } from "@/features/admin/documents/data/admin-documents-repository.server";

export async function POST(request: Request) {
  const invalid = validateDocumentMutation(request); if (invalid) return invalid;
  const parsed = await parseDocumentBody(request, documentBodySchema);
  if (!parsed.success) return Response.json({ error: "ข้อมูลเอกสารไม่ถูกต้อง" }, { status: 400 });
  try { const documentId = await saveAdminDocument({ ...parsed.data, id: null }); revalidateDocuments(parsed.data.slug); return Response.json({ documentId }, { status: 201 }); }
  catch (error) { return documentMutationError(error); }
}

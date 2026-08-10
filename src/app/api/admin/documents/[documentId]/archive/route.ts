import { archiveAdminDocument } from "@/features/admin/documents/data/admin-documents-repository.server";
import { documentArchiveBodySchema, documentMutationError, documentUuidSchema, parseDocumentBody, revalidateDocuments, validateDocumentMutation } from "@/features/admin/documents/api/documents-route";

export async function POST(request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const invalid = validateDocumentMutation(request); if (invalid) return invalid;
  const { documentId } = await params; if (!documentUuidSchema.safeParse(documentId).success) return Response.json({ error: "รหัสเอกสารไม่ถูกต้อง" }, { status: 400 });
  const parsed = await parseDocumentBody(request, documentArchiveBodySchema); if (!parsed.success) return Response.json({ error: "ข้อมูล archive ไม่ถูกต้อง" }, { status: 400 });
  try { await archiveAdminDocument({ ...parsed.data, documentId }); revalidateDocuments(); return Response.json({ documentId }); }
  catch (error) { return documentMutationError(error); }
}

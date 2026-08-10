import { notFound } from "next/navigation";

import { AdminDocumentEditor } from "@/features/admin/documents/components/admin-document-editor";
import { getAdminDocument } from "@/features/admin/documents/data/admin-documents-repository.server";

export default async function EditAdminDocumentRoute({ params }: { params: Promise<{ documentId: string }> }) { const { documentId } = await params; const document = await getAdminDocument(documentId); if (!document) notFound(); return <AdminDocumentEditor document={document} />; }

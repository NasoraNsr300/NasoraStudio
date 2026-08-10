import { AdminDocumentsPage } from "@/features/admin/documents/components/admin-documents-page";
import { listAdminDocuments } from "@/features/admin/documents/data/admin-documents-repository.server";

export default async function AdminDocumentsRoute() { return <AdminDocumentsPage documents={await listAdminDocuments()} />; }

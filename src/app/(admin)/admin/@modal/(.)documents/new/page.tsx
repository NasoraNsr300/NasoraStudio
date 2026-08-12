import { AdminDocumentEditor } from "@/features/admin/documents/components/admin-document-editor";
import { AdminModalShell } from "@/features/admin/modal/admin-modal-shell";

export default function NewAdminDocumentModal() {
  return <AdminModalShell mode="fullscreen" title="สร้างเอกสาร"><AdminDocumentEditor document={null} /></AdminModalShell>;
}

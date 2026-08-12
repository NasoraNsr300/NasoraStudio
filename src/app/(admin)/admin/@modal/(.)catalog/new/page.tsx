import { AdminAlbumEditor } from "@/features/admin/catalog/components/admin-album-editor";
import { AdminModalShell } from "@/features/admin/modal/admin-modal-shell";

export default function NewAdminCatalogAlbumModal() {
  return <AdminModalShell mode="fullscreen" title="เพิ่มอัลบั้ม"><AdminAlbumEditor initialAlbum={null} presentation="modal" /></AdminModalShell>;
}

import { listAdminAlbums } from "@/features/admin/catalog/data/admin-catalog-repository.server";
import { AdminModalShell } from "@/features/admin/modal/admin-modal-shell";
import { AdminPortfolioEditor } from "@/features/admin/portfolio/components/admin-portfolio-editor";

export default async function NewAdminPortfolioModal() {
  const albums = (await listAdminAlbums()).filter((album) => !album.archivedAt)
    .map(({ id, name, published, slug }) => ({ id, name, published, slug }));
  return <AdminModalShell mode="fullscreen" title="เพิ่มผลงาน"><AdminPortfolioEditor albums={albums} initialItem={null} presentation="modal" /></AdminModalShell>;
}

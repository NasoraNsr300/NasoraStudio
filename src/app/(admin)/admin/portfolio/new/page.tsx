import { AdminPortfolioEditor } from "@/features/admin/portfolio/components/admin-portfolio-editor";
import { listAdminAlbums } from "@/features/admin/catalog/data/admin-catalog-repository.server";

export default async function NewAdminPortfolioRoute() {
  const albums = (await listAdminAlbums()).filter((album) => !album.archivedAt)
    .map(({ id, name, published, slug }) => ({ id, name, published, slug }));
  return <AdminPortfolioEditor albums={albums} initialItem={null} />;
}

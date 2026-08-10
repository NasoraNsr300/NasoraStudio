import { notFound } from "next/navigation";

import { listAdminAlbums } from "@/features/admin/catalog/data/admin-catalog-repository.server";
import { AdminPortfolioEditor } from "@/features/admin/portfolio/components/admin-portfolio-editor";
import { getAdminPortfolioItem } from "@/features/admin/portfolio/data/admin-portfolio-repository.server";

export default async function AdminPortfolioItemRoute({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const [item, allAlbums] = await Promise.all([getAdminPortfolioItem(itemId), listAdminAlbums()]);
  if (!item) notFound();
  const albums = allAlbums.filter((album) => !album.archivedAt || album.id === item.albumId)
    .map(({ id, name, published, slug }) => ({ id, name, published, slug }));
  return <AdminPortfolioEditor albums={albums} initialItem={item} />;
}

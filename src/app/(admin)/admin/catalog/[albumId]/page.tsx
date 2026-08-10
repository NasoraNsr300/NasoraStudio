import { notFound } from "next/navigation";

import { AdminAlbumEditor } from "@/features/admin/catalog/components/admin-album-editor";
import { getAdminAlbum } from "@/features/admin/catalog/data/admin-catalog-repository.server";

export default async function AdminCatalogAlbumRoute({ params }: { params: Promise<{ albumId: string }> }) {
  const { albumId } = await params;
  const album = await getAdminAlbum(albumId);
  if (!album) notFound();
  return <AdminAlbumEditor initialAlbum={album} />;
}

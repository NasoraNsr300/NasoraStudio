import { AdminCatalogPage } from "@/features/admin/catalog/components/admin-catalog-page";
import { listAdminAlbums } from "@/features/admin/catalog/data/admin-catalog-repository.server";

export default async function AdminCatalogRoute() {
  return <AdminCatalogPage albums={await listAdminAlbums()} />;
}

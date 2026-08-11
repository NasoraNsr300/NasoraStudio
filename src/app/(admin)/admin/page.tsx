import { AdminDashboard } from "@/features/admin/components/admin-dashboard";
import { getAdminDashboard } from "@/features/admin/dashboard/data/admin-dashboard-repository.server";

export default async function AdminPage() {
  const dashboard = await getAdminDashboard();
  return <AdminDashboard dashboard={dashboard} />;
}

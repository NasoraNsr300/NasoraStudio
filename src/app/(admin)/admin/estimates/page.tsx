import { AdminEstimatesPage } from "@/features/admin/components/admin-section-pages";
import { listAdminEstimateRequests } from "@/features/admin/estimates/data/admin-estimate-repository.server";

export default async function EstimatesPage() {
  const requests = await listAdminEstimateRequests();

  return <AdminEstimatesPage requests={requests} />;
}

import { AdminEstimatesPage } from "@/features/admin/components/admin-section-pages";
import { getAdminEstimateRequest, listAdminEstimateRequests } from "@/features/admin/estimates/data/admin-estimate-repository.server";
import { adminEstimateRequestIdSchema } from "@/features/admin/estimates/domain/admin-estimate-request-id";

export default async function EstimatesPage({ searchParams }: { searchParams: Promise<{ request?: string | string[] }> }) {
  const requests = await listAdminEstimateRequests();
  const selected = (await searchParams).request;
  const requestId = typeof selected === "string" ? adminEstimateRequestIdSchema.safeParse(selected).data : undefined;
  const detail = requestId ? await getAdminEstimateRequest(requestId) : null;

  return <AdminEstimatesPage detail={detail} requests={requests} />;
}

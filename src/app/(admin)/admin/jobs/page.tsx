import { AdminJobsPage } from "@/features/admin/components/admin-section-pages";
import { listAdminJobs } from "@/features/admin/jobs/data/admin-job-repository.server";

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const query = await searchParams;
  return <AdminJobsPage initialShowGuest={query.new === "guest"} jobs={await listAdminJobs()} />;
}

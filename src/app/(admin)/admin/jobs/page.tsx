import { AdminJobsPage } from "@/features/admin/components/admin-section-pages";
import { listAdminJobs } from "@/features/admin/jobs/data/admin-job-repository.server";

export default async function JobsPage() {
  return <AdminJobsPage jobs={await listAdminJobs()} />;
}

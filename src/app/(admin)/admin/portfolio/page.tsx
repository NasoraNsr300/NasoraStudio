import { AdminPortfolioPage } from "@/features/admin/portfolio/components/admin-portfolio-page";
import { listAdminPortfolio } from "@/features/admin/portfolio/data/admin-portfolio-repository.server";

export default async function AdminPortfolioRoute() {
  return <AdminPortfolioPage items={await listAdminPortfolio()} />;
}

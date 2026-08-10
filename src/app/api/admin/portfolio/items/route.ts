import { saveAdminPortfolioItem } from "@/features/admin/portfolio/data/admin-portfolio-repository.server";
import {
  parsePortfolioBody,
  portfolioBodySchema,
  portfolioMutationError,
  revalidatePortfolio,
  validatePortfolioMutation,
} from "@/features/admin/portfolio/api/portfolio-route";

export async function POST(request: Request) {
  const invalid = validatePortfolioMutation(request);
  if (invalid) return invalid;
  const parsed = await parsePortfolioBody(request, portfolioBodySchema);
  if (!parsed.success) return Response.json({ error: "à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸œà¸¥à¸‡à¸²à¸™à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡" }, { status: 400 });
  try {
    const itemId = await saveAdminPortfolioItem({ ...parsed.data, id: null });
    revalidatePortfolio();
    return Response.json({ itemId }, { status: 201 });
  } catch (error) {
    return portfolioMutationError(error);
  }
}

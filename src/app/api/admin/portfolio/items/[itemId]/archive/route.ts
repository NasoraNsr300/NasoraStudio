import { archiveAdminPortfolioItem } from "@/features/admin/portfolio/data/admin-portfolio-repository.server";
import {
  parsePortfolioBody,
  portfolioArchiveBodySchema,
  portfolioMutationError,
  portfolioUuidSchema,
  revalidatePortfolio,
  validatePortfolioMutation,
} from "@/features/admin/portfolio/api/portfolio-route";

export async function POST(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const invalid = validatePortfolioMutation(request);
  if (invalid) return invalid;
  const { itemId } = await params;
  if (!portfolioUuidSchema.safeParse(itemId).success) return Response.json({ error: "à¸£à¸«à¸±à¸ªà¸œà¸¥à¸‡à¸²à¸™à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡" }, { status: 400 });
  const parsed = await parsePortfolioBody(request, portfolioArchiveBodySchema);
  if (!parsed.success) return Response.json({ error: "à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ archive à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡" }, { status: 400 });
  try {
    await archiveAdminPortfolioItem({ ...parsed.data, itemId });
    revalidatePortfolio();
    return Response.json({ itemId });
  } catch (error) {
    return portfolioMutationError(error);
  }
}

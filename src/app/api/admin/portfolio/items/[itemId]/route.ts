import { saveAdminPortfolioItem } from "@/features/admin/portfolio/data/admin-portfolio-repository.server";
import {
  parsePortfolioBody,
  portfolioBodySchema,
  portfolioMutationError,
  portfolioUuidSchema,
  revalidatePortfolio,
  validatePortfolioMutation,
} from "@/features/admin/portfolio/api/portfolio-route";

export async function PATCH(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const invalid = validatePortfolioMutation(request);
  if (invalid) return invalid;
  const { itemId } = await params;
  if (!portfolioUuidSchema.safeParse(itemId).success) return Response.json({ error: "à¸£à¸«à¸±à¸ªà¸œà¸¥à¸‡à¸²à¸™à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡" }, { status: 400 });
  const parsed = await parsePortfolioBody(request, portfolioBodySchema);
  if (!parsed.success) return Response.json({ error: "à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸œà¸¥à¸‡à¸²à¸™à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡" }, { status: 400 });
  try {
    await saveAdminPortfolioItem({ ...parsed.data, id: itemId });
    revalidatePortfolio();
    return Response.json({ itemId });
  } catch (error) {
    return portfolioMutationError(error);
  }
}

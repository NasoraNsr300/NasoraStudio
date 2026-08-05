import { getPublicContentRepository } from "@/data/fixture-public-content-repository";
import { PortfolioPage } from "@/features/portfolio/components/portfolio-page";
import { isLocale } from "@/shared/i18n/locales";

type PortfolioRouteProps = Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[]; category?: string | string[] }>;
}>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PortfolioRoute({ params, searchParams }: PortfolioRouteProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) return null;

  const items = await getPublicContentRepository().getPortfolio(
    locale,
    firstValue(query.q),
    firstValue(query.category),
  );

  return <PortfolioPage items={items} locale={locale} />;
}

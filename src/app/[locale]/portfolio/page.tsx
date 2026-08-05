import { Suspense } from "react";

import { getPublicContentRepository } from "@/data/fixture-public-content-repository";
import { PortfolioPage } from "@/features/portfolio/components/portfolio-page";
import { PortfolioSearch } from "@/features/portfolio/components/portfolio-search";
import { isLocale } from "@/shared/i18n/locales";

export function generateStaticParams() {
  return [{ locale: "th" }, { locale: "en" }];
}

export default async function PortfolioRoute({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;

  const items = await getPublicContentRepository().getPortfolio(locale);

  return (
    <Suspense fallback={<PortfolioPage items={items} locale={locale} />}>
      <PortfolioSearch items={items} locale={locale} />
    </Suspense>
  );
}

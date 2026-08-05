import { notFound } from "next/navigation";

import { getPublicContentRepository } from "@/data/fixture-public-content-repository";
import { serviceCategories } from "@/data/fixtures/public-content";
import { ServiceCategoryPage } from "@/features/commission/components/service-category-page";
import { isLocale, locales } from "@/shared/i18n/locales";

export function generateStaticParams() {
  return locales.flatMap((locale) => serviceCategories.filter((category) => category.published).map((category) => ({ locale, category: category.slug })));
}

export default async function CommissionCategoryRoute({ params }: Readonly<{ params: Promise<{ locale: string; category: string }> }>) {
  const { category: slug, locale } = await params;
  if (!isLocale(locale)) notFound();
  const result = await getPublicContentRepository().getServiceCategory(locale, slug);
  if (!result) notFound();
  return <ServiceCategoryPage category={result.category} locale={locale} services={result.types} />;
}

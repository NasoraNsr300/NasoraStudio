import { notFound } from "next/navigation";

import { getPublicAlbum } from "@/features/catalog/data/public-catalog-repository.server";
import { ServiceCategoryPage } from "@/features/commission/components/service-category-page";
import { isLocale } from "@/shared/i18n/locales";

export default async function CommissionCategoryRoute({ params }: Readonly<{ params: Promise<{ locale: string; category: string }> }>) {
  const { category: slug, locale } = await params;
  if (!isLocale(locale)) notFound();
  const result = await getPublicAlbum(locale, slug);
  if (!result) notFound();
  return <ServiceCategoryPage category={result.category} locale={locale} services={result.types} />;
}

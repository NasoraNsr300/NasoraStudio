import { getPublicContentRepository } from "@/data/fixture-public-content-repository";
import { CommissionAlbumsPage } from "@/features/commission/components/commission-albums-page";
import { isLocale, locales } from "@/shared/i18n/locales";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function CommissionRoute({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const categories = await getPublicContentRepository().getServiceCategories(locale);
  return <CommissionAlbumsPage categories={categories} locale={locale} />;
}

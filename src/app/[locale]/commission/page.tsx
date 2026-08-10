import { Suspense } from "react";

import { listPublicAlbums } from "@/features/catalog/data/public-catalog-repository.server";
import { CommissionAlbumsPage } from "@/features/commission/components/commission-albums-page";
import { CommissionSearch } from "@/features/commission/components/commission-search";
import { isLocale, locales } from "@/shared/i18n/locales";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function CommissionRoute({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const catalog = await listPublicAlbums(locale);
  return (
    <Suspense fallback={<CommissionAlbumsPage categories={catalog.categories} locale={locale} services={catalog.types} />}>
      <CommissionSearch categories={catalog.categories} locale={locale} services={catalog.types} />
    </Suspense>
  );
}

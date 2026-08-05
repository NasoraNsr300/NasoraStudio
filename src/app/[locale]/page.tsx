import { HomePage } from "@/features/home/components/home-page";
import { getPublicContentRepository } from "@/data/fixture-public-content-repository";
import { isLocale } from "@/shared/i18n/locales";

export const dynamic = "force-dynamic";

function getVisitRandomValue() {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0] / 2 ** 32;
}

export default async function HomeRoute({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;

  const home = await getPublicContentRepository().getHome(locale);

  return (
    <HomePage
      featuredItems={home.featured}
      heroItems={home.hero}
      locale={locale}
      randomValue={getVisitRandomValue()}
    />
  );
}

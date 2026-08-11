import { HomePage } from "@/features/home/components/home-page";
import { getLiveHomeContent } from "@/features/home/data/live-home-repository.server";
import { isLocale } from "@/shared/i18n/locales";

export function generateStaticParams() {
  return [{ locale: "th" }, { locale: "en" }];
}

export default async function HomeRoute({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;

  const home = await getLiveHomeContent(locale);

  return (
    <HomePage
      featuredItems={home.featured}
      heroItems={home.hero}
      locale={locale}
      settings={home.settings}
    />
  );
}

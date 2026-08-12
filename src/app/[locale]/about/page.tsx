import { AboutPage } from "@/features/about/components/about-page";
import { getPublicSiteSettings } from "@/features/site-settings/data/public-site-settings-repository.server";
import { isLocale } from "@/shared/i18n/locales";

export function generateStaticParams() { return [{ locale: "th" }, { locale: "en" }]; }

export default async function AboutRoute({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const settings = await getPublicSiteSettings();
  return <AboutPage locale={locale} settings={settings} />;
}

import { AboutPage } from "@/features/about/components/about-page";
import { isLocale } from "@/shared/i18n/locales";

export function generateStaticParams() { return [{ locale: "th" }, { locale: "en" }]; }

export default async function AboutRoute({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  return <AboutPage locale={locale} />;
}

import { getPublicContentRepository } from "@/data/fixture-public-content-repository";
import { QueuePage } from "@/features/queue/components/queue-page";
import { isLocale } from "@/shared/i18n/locales";

export function generateStaticParams() { return [{ locale: "th" }, { locale: "en" }]; }

export default async function QueueRoute({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const items = await getPublicContentRepository().getQueue(locale);
  return <Suspense fallback={null}><QueuePage items={items} locale={locale} /></Suspense>;
}
import { Suspense } from "react";

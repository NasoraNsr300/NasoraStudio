import { Suspense } from "react";

import { QueuePage } from "@/features/queue/components/queue-page";
import { listPublicQueue } from "@/features/queue/data/public-queue-repository.server";
import { QueueSearch } from "@/features/queue/components/queue-search";
import { isLocale } from "@/shared/i18n/locales";

export function generateStaticParams() { return [{ locale: "th" }, { locale: "en" }]; }

export default async function QueueRoute({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const items = await listPublicQueue(locale);
  return (
    <Suspense fallback={<QueuePage initialQuery="" items={items} locale={locale} />}>
      <QueueSearch items={items} locale={locale} />
    </Suspense>
  );
}

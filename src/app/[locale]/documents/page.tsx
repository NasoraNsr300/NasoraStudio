import { Suspense } from "react";

import { DocumentCenterPage } from "@/features/documents/components/document-center-page";
import { DocumentSearch } from "@/features/documents/components/document-search";
import { listPublicDocuments } from "@/features/documents/data/public-documents-repository.server";
import { isLocale } from "@/shared/i18n/locales";

export function generateStaticParams() { return [{ locale: "th" }, { locale: "en" }]; }

export default async function DocumentsRoute({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const documents = await listPublicDocuments(locale);
  return (
    <Suspense fallback={<DocumentCenterPage documents={documents} initialQuery="" locale={locale} />}>
      <DocumentSearch documents={documents} locale={locale} />
    </Suspense>
  );
}

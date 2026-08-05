import { getPublicContentRepository } from "@/data/fixture-public-content-repository";
import { DocumentCenterPage } from "@/features/documents/components/document-center-page";
import { isLocale } from "@/shared/i18n/locales";

export function generateStaticParams() { return [{ locale: "th" }, { locale: "en" }]; }

export default async function DocumentsRoute({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const documents = await getPublicContentRepository().getDocuments(locale);
  return <Suspense fallback={null}><DocumentCenterPage documents={documents} locale={locale} /></Suspense>;
}
import { Suspense } from "react";

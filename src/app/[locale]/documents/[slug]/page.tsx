import { notFound } from "next/navigation";

import { getPublicContentRepository } from "@/data/fixture-public-content-repository";
import { DocumentReader } from "@/features/documents/components/document-reader";
import { locales, isLocale } from "@/shared/i18n/locales";

export async function generateStaticParams() {
  const documents = await getPublicContentRepository().getDocuments("en");
  return locales.flatMap((locale) => documents.map((document) => ({ locale, slug: document.slug })));
}

export default async function DocumentRoute({ params }: Readonly<{ params: Promise<{ locale: string; slug: string }> }>) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const document = await getPublicContentRepository().getDocument(locale, slug);
  if (!document) notFound();
  return <DocumentReader document={document} locale={locale} mode="route" />;
}

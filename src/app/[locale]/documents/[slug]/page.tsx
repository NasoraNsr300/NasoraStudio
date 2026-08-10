import { notFound } from "next/navigation";

import { DocumentReader } from "@/features/documents/components/document-reader";
import { getPublicDocument } from "@/features/documents/data/public-documents-repository.server";
import { isLocale } from "@/shared/i18n/locales";

export default async function DocumentRoute({ params }: Readonly<{ params: Promise<{ locale: string; slug: string }> }>) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const document = await getPublicDocument(slug);
  if (!document) notFound();
  return <DocumentReader document={document} locale={locale} mode="route" />;
}

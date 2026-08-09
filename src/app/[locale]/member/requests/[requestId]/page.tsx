import { MemberRequestQuotePage } from "@/features/member/components/member-request-quote-page";
import { isLocale } from "@/shared/i18n/locales";
import { notFound } from "next/navigation";
import { z } from "zod";

const requestIdSchema = z.uuid();

export default async function MemberRequestQuoteRoute({ params }: Readonly<{ params: Promise<{ locale: string; requestId: string }> }>) {
  const { locale, requestId } = await params;
  if (!isLocale(locale)) return null;
  if (!requestIdSchema.safeParse(requestId).success) notFound();
  return <MemberRequestQuotePage locale={locale} requestId={requestId} />;
}

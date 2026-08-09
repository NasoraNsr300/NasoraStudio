import { MemberRequestQuotePage } from "@/features/member/components/member-request-quote-page";
import { isLocale } from "@/shared/i18n/locales";

export default async function MemberRequestQuoteRoute({ params }: Readonly<{ params: Promise<{ locale: string; requestId: string }> }>) {
  const { locale, requestId } = await params;
  if (!isLocale(locale)) return null;
  return <MemberRequestQuotePage locale={locale} requestId={requestId} />;
}

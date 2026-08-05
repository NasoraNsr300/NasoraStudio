import { MemberPaymentsPage } from "@/features/member/components/member-payments-page";
import { isLocale } from "@/shared/i18n/locales";

export default async function PaymentsRoute({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  return <MemberPaymentsPage locale={locale} />;
}

import { MemberRequestsPage } from "@/features/member/components/member-requests-page";
import { isLocale } from "@/shared/i18n/locales";

export default async function RequestsRoute({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  return <MemberRequestsPage locale={locale} />;
}

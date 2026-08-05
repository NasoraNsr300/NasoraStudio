import { MemberMessagesPage } from "@/features/member/components/member-messages-page";
import { isLocale } from "@/shared/i18n/locales";

export default async function MessagesRoute({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  return <MemberMessagesPage locale={locale} />;
}

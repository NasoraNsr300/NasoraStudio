import { MemberMessagesPage } from "@/features/member/components/member-messages-page";
import { listMemberConversations } from "@/features/collaboration/data/collaboration-repository.server";
import { isLocale } from "@/shared/i18n/locales";

export default async function MessagesRoute({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const conversations = await listMemberConversations(locale);
  return <MemberMessagesPage conversations={conversations} locale={locale} />;
}

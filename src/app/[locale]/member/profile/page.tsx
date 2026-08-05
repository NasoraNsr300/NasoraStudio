import { MemberProfilePage } from "@/features/member/components/member-profile-page";
import { isLocale } from "@/shared/i18n/locales";

export default async function ProfileRoute({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  return <MemberProfilePage locale={locale} />;
}

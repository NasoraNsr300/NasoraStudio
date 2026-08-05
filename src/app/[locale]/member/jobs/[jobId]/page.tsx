import { MemberJobPage } from "@/features/member/components/member-job-page";
import { isLocale } from "@/shared/i18n/locales";

export default async function MemberJobRoute({ params }: Readonly<{ params: Promise<{ jobId: string; locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  return <MemberJobPage locale={locale} />;
}

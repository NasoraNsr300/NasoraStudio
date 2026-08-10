import { MemberJobsPage } from "@/features/member/components/member-jobs-page";
import { listMemberJobs } from "@/features/member/data/member-job-repository.server";
import { isLocale } from "@/shared/i18n/locales";

export default async function MemberJobsRoute({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  return <MemberJobsPage jobs={await listMemberJobs(locale)} locale={locale} />;
}

import { MemberPaymentsPage } from "@/features/member/components/member-payments-page";
import { listMemberJobs } from "@/features/member/data/member-job-repository.server";
import { isLocale } from "@/shared/i18n/locales";

export default async function PaymentsRoute({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const jobs = await listMemberJobs(locale);
  return <MemberPaymentsPage jobs={jobs} locale={locale} />;
}

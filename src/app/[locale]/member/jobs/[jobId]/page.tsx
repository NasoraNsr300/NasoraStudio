import { MemberJobPage } from "@/features/member/components/member-job-page";
import { getMemberJob } from "@/features/member/data/member-job-repository.server";
import { isLocale } from "@/shared/i18n/locales";
import { notFound } from "next/navigation";

export default async function MemberJobRoute({ params }: Readonly<{ params: Promise<{ jobId: string; locale: string }> }>) {
  const { jobId, locale } = await params;
  if (!isLocale(locale)) return null;
  const job = await getMemberJob(jobId, locale);
  if (!job) notFound();
  return <MemberJobPage job={job} locale={locale} />;
}

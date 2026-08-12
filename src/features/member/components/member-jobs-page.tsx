import Link from "next/link";
import type { MemberJobView } from "@/features/member/data/member-job-repository.server";
import type { Locale } from "@/shared/i18n/locales";
import { MemberSidebar } from "./member-sidebar";
import styles from "./member-pages.module.css";

export function MemberJobsPage({ jobs, locale }: { jobs: MemberJobView[]; locale: Locale }) {
  const th = locale === "th";
  return <main className={styles.memberArea}><MemberSidebar active="jobs" locale={locale} /><section className={styles.pagePanel}><header className={styles.pageHeader}><div><h1>{th ? "งานของฉัน" : "My jobs"}</h1><p>{th ? "ติดตามสถานะและความคืบหน้าของงาน" : "Track your jobs and progress."}</p></div></header><div className={styles.requestList}>{jobs.map((job) => <article className={styles.jobRow} key={job.id}><div className={styles.requestMain}><strong>{job.title}</strong><small>#{job.code}</small></div><span className={styles.statusPill}>● {job.statusLabel}</span><Link className={styles.rowButton} href={`/${locale}/member/jobs/${job.id}`}>{th ? "ดูงาน" : "View job"}</Link></article>)}</div>{jobs.length === 0 ? <p className={styles.emptyCopy}>{th ? "ยังไม่มีงาน" : "No jobs yet."}</p> : null}</section></main>;
}

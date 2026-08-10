"use client";

import { CreditCard } from "lucide-react";
import Link from "next/link";

import type { MemberJobView } from "@/features/member/data/member-job-repository.server";
import type { Locale } from "@/shared/i18n/locales";

import { MemberSidebar, type MemberSection } from "./member-sidebar";
import styles from "./member-pages.module.css";

function money(satang: number, locale: Locale) {
  return `${new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", { maximumFractionDigits: 2 }).format(satang / 100)} THB`;
}

export function MemberPaymentsContent({ jobs = [], locale }: { jobs?: MemberJobView[]; locale: Locale }) {
  const th = locale === "th";
  return <section className={styles.pagePanel}>
    <header className={styles.pageHeader}><div><h1>{th ? "การชำระเงิน" : "Payments"}</h1><p>{th ? "ตรวจสอบยอดคงเหลือและทยอยชำระผ่าน PromptPay" : "Review balances and make partial PromptPay payments."}</p></div></header>
    {jobs.length === 0 ? <section className={styles.surface}><p className={styles.emptyCopy}>{th ? "ยังไม่มีงานที่พร้อมชำระเงิน" : "No jobs are ready for payment yet."}</p></section> : null}
    <div className={styles.requestList}>{jobs.map((job) => {
      const outstanding = Math.max(0, job.totalSatang - job.paidSatang);
      return <article className={styles.surface} key={job.id}>
        <div className={styles.surfaceTitle}><div><h2>{job.title}</h2><small>#{job.code} · {job.statusLabel}</small></div></div>
        <div className={styles.moneyGrid}><div><small>{th ? "ราคารวม" : "Total"}</small><strong>{money(job.totalSatang, locale)}</strong></div><div><small>{th ? "ชำระแล้ว" : "Paid"}</small><strong className={styles.green}>{money(job.paidSatang, locale)}</strong></div><div><small>{th ? "ยอดคงเหลือ" : "Balance"}</small><strong className={styles.gold}>{money(outstanding, locale)}</strong></div></div>
        {outstanding > 0 ? <Link className={styles.goldButton} href={`/${locale}/member/requests/${job.requestId}`}><CreditCard size={17} />{th ? "ชำระเพิ่มเติม" : "Make payment"}</Link> : <p className={styles.verified}>● {th ? "ชำระครบแล้ว" : "Paid in full"}</p>}
      </article>;
    })}</div>
  </section>;
}

export function MemberPaymentsPage({ jobs = [], locale, onSelectSection }: { jobs?: MemberJobView[]; locale: Locale; onSelectSection?: (section: MemberSection) => void }) {
  return <main className={styles.memberArea}><MemberSidebar active="payments" locale={locale} onSelectSection={onSelectSection} /><MemberPaymentsContent jobs={jobs} locale={locale} /></main>;
}

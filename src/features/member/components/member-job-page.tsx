"use client";

import {
  CalendarDays,
  Check,
  Clock3,
  HelpCircle,
  LockKeyhole,
  RefreshCcw,
  Send,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

import type { Locale } from "@/shared/i18n/locales";
import type { MemberJobView } from "@/features/member/data/member-job-repository.server";

import { MemberMessagesContent } from "./member-messages-page";
import { MemberPaymentsContent } from "./member-payments-page";
import { MemberProfileContent } from "./member-profile-page";
import { MemberRequestsContent } from "./member-requests-page";
import { MemberSidebar, type MemberSection } from "./member-sidebar";
import styles from "./member.module.css";

const copy = {
  th: {
    title: "Illustration — Full Body",
    job: "งาน #NSR-260806-0187",
    status: "กำลังร่าง",
    deadline: "กำหนดส่ง: 28 ส.ค. 2026 (อีก 22 วัน)",
    member: "สมาชิก",
    nav: ["งานของฉัน", "แบบประเมิน", "ข้อความ", "การชำระเงิน", "โปรไฟล์"],
    help: "ต้องการความช่วยเหลือ?",
    contact: "ติดต่อทีมงาน",
    stages: ["ประเมินราคา", "ยืนยันราคา", "มัดจำ", "กำลังทำงาน", "ส่งงาน", "เสร็จสิ้น"],
    progress: "ความคืบหน้างาน",
    cost: "สรุปค่าใช้จ่าย",
    total: "ราคารวม",
    paid: "ชำระแล้ว",
    balance: "คงเหลือ",
    payMore: "ชำระเพิ่มเติม",
    paymentHint: "สามารถชำระเพิ่มบางส่วนได้ ขั้นต่ำ 100 THB",
    quote: "รายละเอียดในใบเสนอราคา",
    usage: "ประเภทการใช้งาน",
    personal: "ใช้ส่วนตัว (Personal Use)",
    due: "กำหนดส่ง",
    revisions: "จำนวนแก้ไข",
    revisionsValue: "4 ครั้ง (รวมในราคาแล้ว)",
    viewQuote: "ดูรายละเอียดใบเสนอราคา",
    latest: "ข้อความล่าสุด",
    openMessages: "ไปที่ข้อความ",
    delivery: "การส่งมอบงาน",
    deliveryHint: "ปลดล็อกเมื่อชำระครบและงานเสร็จสิ้น คุณจะดาวน์โหลดไฟล์หรือเปิด Google Drive ได้จากที่นี่",
    locked: "ปลดล็อกเมื่อพร้อมส่ง",
  },
  en: {
    title: "Illustration — Full Body",
    job: "Job #NSR-260806-0187",
    status: "Sketching",
    deadline: "Due: 28 Aug 2026 (22 days)",
    member: "Member",
    nav: ["My jobs", "Requests", "Messages", "Payments", "Profile"],
    help: "Need help?",
    contact: "Contact support",
    stages: ["Estimate", "Quote accepted", "Deposit", "In progress", "Delivery", "Completed"],
    progress: "Job progress",
    cost: "Cost summary",
    total: "Total",
    paid: "Paid",
    balance: "Balance",
    payMore: "Make a payment",
    paymentHint: "You may make partial payments from THB 100.",
    quote: "Quote details",
    usage: "Usage",
    personal: "Personal Use",
    due: "Deadline",
    revisions: "Revisions",
    revisionsValue: "4 rounds (included)",
    viewQuote: "View quote details",
    latest: "Latest messages",
    openMessages: "Open messages",
    delivery: "Delivery",
    deliveryHint: "Unlocks after the balance is paid and the work is complete. Your file or Google Drive link will appear here.",
    locked: "Unlock when ready",
  },
} as const;

export function MemberJobPage({ job, locale }: { job: MemberJobView; locale: Locale }) {
  const labels = copy[locale];
  const [activeSection, setActiveSection] = useState<MemberSection>("jobs");
  const activeStage = job.statusKey === "completed" ? 5 : job.statusKey === "delivery" ? 4 : 3;
  const downloadableDelivery = job.deliveries?.[0];

  return (
    <main className={styles.memberPage}>
      <MemberSidebar active={activeSection} locale={locale} onSelectSection={setActiveSection} />

      {activeSection === "jobs" && (
        <section className={styles.jobWorkspace}>
          <header className={styles.jobHeader}>
            <h1>{job.title}</h1>
            <div>
              <span>{locale === "th" ? "งาน" : "Job"} #{job.code}</span>
              <b>● {job.statusLabel}</b>
              <span>
                <CalendarDays size={15} />
                {locale === "th" ? "กำหนดส่ง" : "Due"}: {job.deadlineLabel}
              </span>
            </div>
          </header>

          <ol className={styles.stageTrack}>
            {labels.stages.map((stage, index) => {
              const state = index < activeStage || (job.statusKey === "completed" && index === activeStage) ? "done" : index === activeStage ? "active" : "locked";
              return (
              <li className={state === "done" ? styles.stageDone : state === "active" ? styles.stageActive : undefined} data-state={state} key={stage}>
                <span>
                  {state === "done" ? <Check size={17} /> : state === "active" ? <Sparkles size={17} /> : <LockKeyhole size={15} />}
                </span>
                <strong>{stage}</strong>
              </li>
            );})}
          </ol>

          <div className={styles.jobGrid}>
            <section className={styles.timelineCard}>
              <h2>{labels.progress}</h2>
              <div className={styles.timeline}>
                {job.history.map((event) => <article key={event.id}>
                  <time>{event.changedAtLabel}</time>
                  <span className={styles.eventDone}><Check size={15} /></span>
                  <div><strong>{event.statusLabel}</strong>{event.publicNote && <p>{event.publicNote}</p>}</div>
                </article>)}
                {job.progressUpdates?.map((progress) => <article key={progress.id}>
                  <time>{new Date(progress.createdAt).toLocaleString(locale)}</time>
                  <span className={styles.eventActive}><Sparkles size={15} /></span>
                  <div><strong>{progress.title}</strong><p>{progress.body}</p>{progress.imageId ? <a className={styles.progressImage} href={`/api/member/progress-images/${progress.imageId}`} target="_blank"><Image alt={progress.title} height={256} src={`/api/member/progress-images/${progress.imageId}`} unoptimized width={480} /></a> : null}</div>
                </article>)}
              </div>
            </section>

            <div className={styles.jobSide}>
              <section className={styles.paymentCard}>
                <div>
                  <h2>
                    <Sparkles size={18} />
                    {labels.cost}
                  </h2>
                  <dl>
                    <div>
                      <dt>{labels.total}</dt>
                      <dd>{(job.totalSatang / 100).toLocaleString()} THB</dd>
                    </div>
                    <div>
                      <dt>{labels.paid}</dt>
                      <dd className={styles.paid}>
                        {(job.paidSatang / 100).toLocaleString()} THB
                      </dd>
                    </div>
                    <div>
                      <dt>{labels.balance}</dt>
                      <dd className={styles.balance}>{((job.totalSatang - job.paidSatang) / 100).toLocaleString()} THB</dd>
                    </div>
                  </dl>
                  <p>
                    <HelpCircle size={16} />
                    {labels.paymentHint}
                  </p>
                </div>
                <aside>
                  <span>PromptPay</span>
                  <button onClick={() => setActiveSection("payments")} type="button">
                    {labels.payMore}
                  </button>
                  <button className={styles.textButton} onClick={() => setActiveSection("payments")} type="button">
                    วิธีชำระเงิน
                  </button>
                </aside>
              </section>

              <div className={styles.sidePair}>
                <section className={styles.quoteCard}>
                  <h2>{labels.quote}</h2>
                  <dl>
                    <div>
                      <dt>
                        <UserRound size={15} />
                        {labels.usage}
                      </dt>
                      <dd>{job.usageType === "personal" ? (locale === "th" ? "ใช้ส่วนตัว (Personal Use)" : "Personal Use") : (locale === "th" ? "เชิงพาณิชย์ (Commercial Use)" : "Commercial Use")}</dd>
                    </div>
                    <div>
                      <dt>
                        <Clock3 size={15} />
                        {labels.due}
                      </dt>
                      <dd>{job.deadlineLabel}</dd>
                    </div>
                    <div>
                      <dt>
                        <RefreshCcw size={15} />
                        {labels.revisions}
                      </dt>
                      <dd>{job.freeRevisions} {locale === "th" ? "ครั้ง (รวมในราคาแล้ว)" : "rounds (included)"}</dd>
                    </div>
                  </dl>
                  <button className={styles.textButton} onClick={() => setActiveSection("requests")} type="button">
                    {labels.viewQuote} →
                  </button>
                </section>

                <section className={styles.messageCard}>
                  <h2>{labels.latest}</h2>
                  <p>{locale === "th" ? "เปิดห้องสนทนาเพื่อดูข้อความล่าสุดของงานนี้" : "Open the conversation to view latest messages for this job."}</p>
                  <button className={styles.textButton} onClick={() => setActiveSection("messages")} type="button">
                    {labels.openMessages}
                  </button>
                </section>
              </div>

              <section className={styles.deliveryCard}>
                <div>
                  <h2>
                    <LockKeyhole size={18} />
                    {labels.delivery}
                  </h2>
                  {job.deliveries?.length ? job.deliveries.map((delivery) => <p key={delivery.id}>
                    <Link href={`/api/member/deliveries/${delivery.id}/download`}>{delivery.displayName}</Link>
                    {" · "}{locale === "th" ? "ใช้ได้ถึง" : "Available until"} {new Date(delivery.expiresAt).toLocaleDateString(locale)}
                  </p>) : <p>{labels.deliveryHint}</p>}
                </div>
                {downloadableDelivery ? (
                  <Link className={styles.deliveryStatus} href={`/api/member/deliveries/${downloadableDelivery.id}/download`} prefetch={false}>
                    <Send size={17} />
                    {locale === "th" ? "พร้อมดาวน์โหลด" : "Ready to download"}
                  </Link>
                ) : (
                  <span className={styles.deliveryStatus}>
                    <LockKeyhole size={17} />
                    {labels.locked}
                  </span>
                )}
              </section>
            </div>
          </div>
        </section>
      )}

      {activeSection === "requests" && <MemberRequestsContent locale={locale} />}
      {activeSection === "messages" && <MemberMessagesContent locale={locale} />}
      {activeSection === "payments" && <MemberPaymentsContent jobs={[job]} locale={locale} />}
      {activeSection === "profile" && <MemberProfileContent locale={locale} />}
    </main>
  );
}

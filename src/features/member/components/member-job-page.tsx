"use client";

import {
  CalendarDays,
  Check,
  Clock3,
  HelpCircle,
  LockKeyhole,
  MessageSquareText,
  RefreshCcw,
  Send,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { Locale } from "@/shared/i18n/locales";

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

export function MemberJobPage({ locale }: { locale: Locale }) {
  const labels = copy[locale];
  const [activeSection, setActiveSection] = useState<MemberSection>("jobs");

  return (
    <main className={styles.memberPage}>
      <MemberSidebar active={activeSection} locale={locale} onSelectSection={setActiveSection} />

      {activeSection === "jobs" && (
        <section className={styles.jobWorkspace}>
          <header className={styles.jobHeader}>
            <h1>{labels.title}</h1>
            <div>
              <span>{labels.job}</span>
              <b>● {labels.status}</b>
              <span>
                <CalendarDays size={15} />
                {labels.deadline}
              </span>
            </div>
          </header>

          <ol className={styles.stageTrack}>
            {labels.stages.map((stage, index) => (
              <li className={index < 3 ? styles.stageDone : index === 3 ? styles.stageActive : undefined} key={stage}>
                <span>
                  {index < 3 ? <Check size={17} /> : index === 3 ? <Sparkles size={17} /> : <LockKeyhole size={15} />}
                </span>
                <strong>{stage}</strong>
              </li>
            ))}
          </ol>

          <div className={styles.jobGrid}>
            <section className={styles.timelineCard}>
              <h2>{labels.progress}</h2>
              <div className={styles.timeline}>
                <article>
                  <time>
                    20 พ.ค. 2026
                    <br />
                    10:21
                  </time>
                  <span className={styles.eventDone}>
                    <Check size={15} />
                  </span>
                  <div>
                    <strong>ลูกค้ายืนยันราคางาน</strong>
                    <p>ยืนยันราคา 6,500 THB</p>
                  </div>
                </article>
                <article>
                  <time>
                    20 พ.ค. 2026
                    <br />
                    10:36
                  </time>
                  <span className={styles.eventDone}>
                    <Check size={15} />
                  </span>
                  <div>
                    <strong>ตรวจสอบมัดจำแล้ว</strong>
                    <p>
                      มัดจำ 3,250 THB (50%) <em>Verified</em>
                    </p>
                  </div>
                </article>
                <article>
                  <time>
                    21 พ.ค. 2026
                    <br />
                    15:42
                  </time>
                  <span className={styles.eventActive}>
                    <Sparkles size={15} />
                  </span>
                  <div>
                    <strong>อัปเดตร่าง — ภาพร่างขั้นต้น</strong>
                    <p>อัปโหลดภาพร่างขั้นต้น</p>
                    <button className={styles.progressImage} type="button">
                      {/* eslint-disable-next-line @next/next/no-img-element -- fixture image */}
                      <img alt="ภาพร่างขั้นต้น" src="/fixtures/derivatives/forest-card.webp" />
                      <Sparkles size={18} />
                    </button>
                  </div>
                </article>
                <article>
                  <time>
                    21 พ.ค. 2026
                    <br />
                    18:07
                  </time>
                  <span className={styles.eventMessage}>
                    <MessageSquareText size={14} />
                  </span>
                  <div>
                    <strong>ข้อความจากคุณ</strong>
                    <p>ขอปรับท่าคุณให้ยาวขึ้นนิดนึง และเปลี่ยนรูปดาวด้านหลังเป็นพระจันทร์เต็มดวงได้ไหมคะ?</p>
                  </div>
                </article>
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
                      <dd>6,500 THB</dd>
                    </div>
                    <div>
                      <dt>{labels.paid}</dt>
                      <dd className={styles.paid}>
                        3,250 THB <small>(50%)</small>
                      </dd>
                    </div>
                    <div>
                      <dt>{labels.balance}</dt>
                      <dd className={styles.balance}>3,250 THB</dd>
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
                  <Link href="#" onClick={(e) => { e.preventDefault(); setActiveSection("payments"); }}>
                    วิธีชำระเงิน
                  </Link>
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
                      <dd>{labels.personal}</dd>
                    </div>
                    <div>
                      <dt>
                        <Clock3 size={15} />
                        {labels.due}
                      </dt>
                      <dd>28 ส.ค. 2026</dd>
                    </div>
                    <div>
                      <dt>
                        <RefreshCcw size={15} />
                        {labels.revisions}
                      </dt>
                      <dd>{labels.revisionsValue}</dd>
                    </div>
                  </dl>
                  <Link href="#" onClick={(e) => { e.preventDefault(); setActiveSection("requests"); }}>
                    {labels.viewQuote} →
                  </Link>
                </section>

                <section className={styles.messageCard}>
                  <h2>
                    {labels.latest}
                    <b>3</b>
                  </h2>
                  <div>
                    <small>
                      จากทีมงาน <time>15:42</time>
                    </small>
                    <p>อัปเดตร่าง — ภาพร่างขั้นต้น</p>
                  </div>
                  <div>
                    <small>
                      จากคุณ <time>18:07</time>
                    </small>
                    <p>ขอปรับท่าคุณให้ยาวขึ้นนิดนึง...</p>
                  </div>
                  <Link href="#" onClick={(e) => { e.preventDefault(); setActiveSection("messages"); }}>
                    {labels.openMessages}
                  </Link>
                </section>
              </div>

              <section className={styles.deliveryCard}>
                <div>
                  <h2>
                    <LockKeyhole size={18} />
                    {labels.delivery}
                  </h2>
                  <p>{labels.deliveryHint}</p>
                </div>
                <button disabled type="button">
                  <Send size={17} />
                  {labels.locked}
                </button>
              </section>
            </div>
          </div>
        </section>
      )}

      {activeSection === "requests" && <MemberRequestsContent locale={locale} />}
      {activeSection === "messages" && <MemberMessagesContent locale={locale} />}
      {activeSection === "payments" && <MemberPaymentsContent locale={locale} />}
      {activeSection === "profile" && <MemberProfileContent locale={locale} />}
    </main>
  );
}

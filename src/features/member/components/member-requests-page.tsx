import { Clock3, FileCheck2, FileText, Plus } from "lucide-react";

import type { Locale } from "@/shared/i18n/locales";

import { MemberTabs } from "./member-tabs";
import styles from "./member-pages.module.css";

export function MemberRequestsPage({ locale }: { locale: Locale }) {
  const th = locale === "th";
  return <main className={styles.memberArea}><MemberTabs active="requests" locale={locale} /><section className={styles.pagePanel}>
    <header className={styles.pageHeader}><div><h1>{th ? "แบบประเมินของฉัน" : "My requests"}</h1><p>{th ? "ติดตามแบบประเมิน ใบเสนอราคา และคำขอที่ส่งให้ Nasora" : "Track requests, estimates, and quotes sent to Nasora."}</p></div><button type="button"><Plus size={18} />{th ? "ส่งแบบประเมินใหม่" : "New request"}</button></header>
    <div className={styles.stats}><div className={styles.stat}><span><Clock3 /></span><div><strong>1</strong><small>{th ? "รอตรวจสอบ" : "Awaiting review"}</small></div></div><div className={styles.stat}><span><FileCheck2 /></span><div><strong>1</strong><small>{th ? "ได้รับใบเสนอราคา" : "Quote received"}</small></div></div><div className={styles.stat}><span><FileText /></span><div><strong>2</strong><small>{th ? "ปิดรายการแล้ว" : "Closed"}</small></div></div></div>
    <section className={styles.surface}><div className={styles.surfaceTitle}><h2>{th ? "รายการล่าสุด" : "Recent requests"}</h2><span>4 {th ? "รายการ" : "items"}</span></div><div className={styles.requestList}>
      <article className={styles.requestRow}><div className={styles.requestMain}><strong>Illustration — Full Body</strong><small>#REQ-260806-0042 · ส่งเมื่อ 6 ส.ค. 2026</small></div><div className={styles.requestMeta}><span>{th ? "งบประมาณ" : "Budget"}</span><strong>3,500–6,000 THB</strong></div><span className={`${styles.statusPill} ${styles.waiting}`}>● {th ? "รอตรวจสอบ" : "Awaiting review"}</span><button className={styles.rowButton} type="button">{th ? "ดูรายละเอียด" : "Details"}</button></article>
      <article className={styles.requestRow}><div className={styles.requestMain}><strong>Chibi — Full Body</strong><small>#REQ-260725-0038 · ส่งเมื่อ 25 ก.ค. 2026</small></div><div className={styles.requestMeta}><span>{th ? "ราคาที่เสนอ" : "Quoted"}</span><strong>1,800 THB</strong></div><span className={`${styles.statusPill} ${styles.quoted}`}>● {th ? "รอยืนยันราคา" : "Awaiting decision"}</span><button className={styles.rowButton} type="button">{th ? "ดูใบเสนอราคา" : "View quote"}</button></article>
      <article className={styles.requestRow}><div className={styles.requestMain}><strong>VTuber — Reference</strong><small>#REQ-260610-0021 · ส่งเมื่อ 10 มิ.ย. 2026</small></div><div className={styles.requestMeta}><span>{th ? "สถานะล่าสุด" : "Latest status"}</span><strong>{th ? "ยกเลิกโดยลูกค้า" : "Cancelled"}</strong></div><span className={`${styles.statusPill} ${styles.closed}`}>● {th ? "ปิดรายการ" : "Closed"}</span><button className={styles.rowButton} type="button">{th ? "ดูประวัติ" : "History"}</button></article>
    </div></section>
  </section></main>;
}

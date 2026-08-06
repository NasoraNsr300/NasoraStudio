"use client";

import { CreditCard } from "lucide-react";

import type { Locale } from "@/shared/i18n/locales";

import { MemberSidebar, type MemberSection } from "./member-sidebar";
import styles from "./member-pages.module.css";

export function MemberPaymentsContent({ locale }: { locale: Locale }) {
  const th = locale === "th";

  return (
    <section className={styles.pagePanel}>
      <header className={styles.pageHeader}>
        <div>
          <h1>{th ? "การชำระเงิน" : "Payments"}</h1>
          <p>{th ? "ตรวจสอบยอดคงเหลือ การทยอยชำระ และสถานะสลิป" : "Review balances, partial payments, and slip verification."}</p>
        </div>
      </header>
      <div className={styles.paymentOverview}>
        <section className={`${styles.surface} ${styles.balanceCard}`}>
          <h2>{th ? "ภาพรวมงานปัจจุบัน" : "Current job overview"}</h2>
          <div className={styles.moneyGrid}>
            <div>
              <small>{th ? "ราคารวม" : "Total"}</small>
              <strong>6,500 THB</strong>
            </div>
            <div>
              <small>{th ? "ชำระแล้ว" : "Paid"}</small>
              <strong className={styles.green}>3,250 THB</strong>
            </div>
            <div>
              <small>{th ? "ยอดคงเหลือ" : "Balance"}</small>
              <strong className={styles.gold}>3,250 THB</strong>
            </div>
          </div>
        </section>
        <section className={`${styles.surface} ${styles.paymentAction}`}>
          <h2>PromptPay</h2>
          <p>{th ? "เลือกจำนวนที่ต้องการชำระ ขั้นต่ำ 100 THB หรือชำระยอดที่เหลือทั้งหมด" : "Choose an amount from THB 100, or pay the remaining balance."}</p>
          <button className={styles.goldButton} type="button">
            <CreditCard size={17} />
            {th ? "ชำระเพิ่มเติม" : "Make payment"}
          </button>
        </section>
      </div>
      <section className={styles.surface}>
        <div className={styles.surfaceTitle}>
          <h2>{th ? "ประวัติการชำระเงิน" : "Payment history"}</h2>
          <span>3 {th ? "รายการ" : "items"}</span>
        </div>
        <table className={styles.paymentTable}>
          <thead>
            <tr>
              <th>{th ? "รายการ" : "Payment"}</th>
              <th>{th ? "งาน" : "Job"}</th>
              <th>{th ? "จำนวน" : "Amount"}</th>
              <th>{th ? "วันที่" : "Date"}</th>
              <th>{th ? "สถานะ" : "Status"}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>{th ? "มัดจำ 50%" : "50% deposit"}</strong>
                <small>#PAY-260520-001</small>
              </td>
              <td>Illustration — Full Body</td>
              <td>3,250 THB</td>
              <td>20 พ.ค. 2026</td>
              <td className={styles.verified}>● Verified</td>
              <td>
                <button className={styles.rowButton}>ดูสลิป</button>
              </td>
            </tr>
            <tr>
              <td>
                <strong>{th ? "ยอดชำระเต็ม" : "Full payment"}</strong>
                <small>#PAY-260225-008</small>
              </td>
              <td>Chibi — Full Body</td>
              <td>1,800 THB</td>
              <td>25 ก.พ. 2026</td>
              <td className={styles.verified}>● Verified</td>
              <td>
                <button className={styles.rowButton}>ดูสลิป</button>
              </td>
            </tr>
            <tr>
              <td>
                <strong>{th ? "ชำระบางส่วน" : "Partial payment"}</strong>
                <small>#PAY-260806-012</small>
              </td>
              <td>Illustration — Full Body</td>
              <td>500 THB</td>
              <td>6 ส.ค. 2026</td>
              <td className={styles.pending}>● {th ? "รอตรวจสอบ" : "Pending"}</td>
              <td>
                <button className={styles.rowButton}>ดูสลิป</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </section>
  );
}

export function MemberPaymentsPage({
  locale,
  onSelectSection,
}: {
  locale: Locale;
  onSelectSection?: (section: MemberSection) => void;
}) {
  return (
    <main className={styles.memberArea}>
      <MemberSidebar active="payments" locale={locale} onSelectSection={onSelectSection} />
      <MemberPaymentsContent locale={locale} />
    </main>
  );
}

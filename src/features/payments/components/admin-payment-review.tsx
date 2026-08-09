"use client";

import { Check, CircleDollarSign, Eye, X } from "lucide-react";
import { useState } from "react";

import styles from "./admin-payment-review.module.css";

export type PendingPaymentReview = {
  amountSatang: number;
  id: string;
  kind: "deposit" | "final" | "installment";
  previewUrl: string;
  requestId: string;
  uploadedAt: string;
};

type Verification = { decision: "approve" | "reject"; idempotencyKey: string; paymentId: string; reason?: string };

async function submitVerification(input: Verification) {
  const response = await fetch(`/api/admin/payments/${input.paymentId}/verify`, { body: JSON.stringify({ decision: input.decision, idempotencyKey: input.idempotencyKey, ...(input.reason ? { reason: input.reason } : {}) }), headers: { "content-type": "application/json" }, method: "POST" });
  if (!response.ok) throw new Error("Unable to verify payment");
}

function formatThb(satang: number) { return `฿${new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(satang / 100)}`; }
function paymentKind(kind: PendingPaymentReview["kind"]) { return kind === "deposit" ? "มัดจำ" : kind === "final" ? "ยอดสุดท้าย" : "ชำระบางส่วน"; }

export function AdminPaymentReview({ onVerify = submitVerification, payments }: { onVerify?: (input: Verification) => Promise<void>; payments: PendingPaymentReview[] }) {
  const [items, setItems] = useState(payments);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function verify(paymentId: string, decision: Verification["decision"]) {
    if (decision === "reject" && !reason.trim()) { setError("กรุณาระบุเหตุผลก่อนปฏิเสธสลิป"); return; }
    setBusy(paymentId); setError(null);
    try {
      await onVerify({ decision, idempotencyKey: crypto.randomUUID(), paymentId, ...(decision === "reject" ? { reason: reason.trim() } : {}) });
      setItems((current) => current.filter((item) => item.id !== paymentId));
      setRejecting(null); setReason("");
    } catch { setError("ไม่สามารถบันทึกผลการตรวจสอบได้"); }
    finally { setBusy(null); }
  }

  const total = items.reduce((sum, item) => sum + item.amountSatang, 0);
  return <section className={styles.sectionPage}>
    <header className={styles.pageHeader}><div><span><CircleDollarSign size={25} /></span><div><h1>การชำระเงิน</h1><p>ตรวจสลิป ยืนยันยอดมัดจำ และเก็บประวัติการชำระเงินถาวร</p></div></div></header>
    <div className={styles.metricRow}><article><small>รอตรวจสลิป</small><strong>{items.length}</strong><span>ยอดรวม {formatThb(total)}</span></article><article><small>ไฟล์สลิป</small><strong>Private R2</strong><span>ลิงก์ดูภาพหมดอายุอัตโนมัติ</span></article><article><small>หลังอนุมัติ</small><strong>Verified</strong><span>สร้างงานในขั้นตอนถัดไป</span></article></div>
    <section className={styles.dataPanel} aria-label="รายการสลิปรอตรวจ">
      <table><thead><tr><th>คำขอ</th><th>ประเภท</th><th>ยอดชำระ</th><th>อัปโหลด</th><th>สถานะ</th><th>สลิป</th><th>จัดการ</th></tr></thead>
        <tbody>{items.length ? items.map((payment) => <tr key={payment.id}><td>{payment.requestId.slice(0, 8)}</td><td>{paymentKind(payment.kind)}</td><td>{formatThb(payment.amountSatang)}</td><td>{new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(payment.uploadedAt))}</td><td><span className={styles.pending}>● รอตรวจ</span></td><td><a aria-label={`ดูสลิป ${payment.requestId.slice(0, 8)}`} className={styles.iconAction} href={payment.previewUrl} rel="noreferrer" target="_blank"><Eye size={17} /></a></td><td><div className={styles.actions}><button aria-label={`อนุมัติ ${payment.requestId.slice(0, 8)}`} disabled={busy === payment.id} onClick={() => void verify(payment.id, "approve")} type="button"><Check size={15} />อนุมัติ</button><button aria-label={`ปฏิเสธ ${payment.requestId.slice(0, 8)}`} disabled={busy === payment.id} onClick={() => { setRejecting(payment.id); setError(null); }} type="button"><X size={15} />ปฏิเสธ</button></div>{rejecting === payment.id ? <div className={styles.rejectBox}><label>เหตุผล<input aria-label="เหตุผลการปฏิเสธ" onChange={(event) => setReason(event.target.value)} value={reason} /></label>{error ? <p role="alert">{error}</p> : null}<button disabled={busy === payment.id} onClick={() => void verify(payment.id, "reject")} type="button">ยืนยันการปฏิเสธ</button></div> : null}</td></tr>) : <tr><td className={styles.empty} colSpan={7}>ไม่มีสลิปที่รอตรวจสอบ</td></tr>}</tbody>
      </table>
    </section>
  </section>;
}

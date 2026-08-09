"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { MemberQuotePanel, type DepositPaymentHandoff } from "@/features/member/components/member-quote-panel";
import { createMemberQuoteRepository, type MemberQuote, type MemberQuoteClient } from "@/features/member/data/member-quote-repository";
import { useOptionalAuthSession } from "@/shared/auth/auth-session-provider";
import type { Locale } from "@/shared/i18n/locales";
import { createSupabaseBrowserClient } from "@/shared/supabase/client";

import { MemberSidebar } from "./member-sidebar";
import styles from "./member-pages.module.css";

type Props = {
  locale: Locale;
  repository?: ReturnType<typeof createMemberQuoteRepository>;
  requestId: string;
};

export function MemberRequestQuotePage({ locale, repository, requestId }: Props) {
  const session = useOptionalAuthSession();
  const repositoryRef = useRef(repository ?? null);
  const [quote, setQuote] = useState<MemberQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentPending, setPaymentPending] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<{ amountSatang: number; paymentId: string; promptPayPayload: string } | null>(null);
  const [slipStatus, setSlipStatus] = useState<string | null>(null);
  const th = locale === "th";

  useEffect(() => {
    if (repository) repositoryRef.current = repository;
  }, [repository]);

  const getRepository = useCallback(() => {
    if (!repositoryRef.current) {
      repositoryRef.current = createMemberQuoteRepository(createSupabaseBrowserClient() as unknown as MemberQuoteClient);
    }
    return repositoryRef.current;
  }, []);

  useEffect(() => {
    if (session?.status !== "signedIn") return;
    let active = true;
    void getRepository().load(requestId).then((result) => {
      if (!active) return;
      if (result.ok) setQuote(result.data);
      else setError(result.message);
      setLoading(false);
    });
    return () => { active = false; };
  }, [getRepository, requestId, session?.status]);

  async function startDeposit(handoff: DepositPaymentHandoff) {
    setPaymentPending(true); setError(null);
    try {
      const response = await fetch(`/api/member/payments/${handoff.quoteId}/intent`, { body: JSON.stringify({ depositSatang: handoff.depositSatang, idempotencyKey: crypto.randomUUID(), requestId: handoff.requestId }), headers: { "content-type": "application/json" }, method: "POST" });
      if (!response.ok) throw new Error("intent_failed");
      setPaymentIntent(await response.json() as { amountSatang: number; paymentId: string; promptPayPayload: string });
    } catch { setError(th ? "ไม่สามารถเริ่มการชำระเงินได้" : "Unable to start the payment."); }
    finally { setPaymentPending(false); }
  }

  async function uploadSlip(file: File) {
    if (!paymentIntent) return;
    setPaymentPending(true); setError(null);
    try {
      const authorization = await fetch(`/api/member/payments/${paymentIntent.paymentId}/slip-upload`, { body: JSON.stringify({ action: "authorize", contentType: file.type, idempotencyKey: crypto.randomUUID(), sizeBytes: file.size }), headers: { "content-type": "application/json" }, method: "POST" });
      if (!authorization.ok) throw new Error("authorization_failed");
      const authorized = await authorization.json() as { slipId: string; uploadUrl: string };
      const upload = await fetch(authorized.uploadUrl, { body: file, headers: { "content-type": file.type }, method: "PUT" });
      if (!upload.ok) throw new Error("upload_failed");
      const confirmation = await fetch(`/api/member/payments/${paymentIntent.paymentId}/slip-upload`, { body: JSON.stringify({ action: "confirm", slipId: authorized.slipId }), headers: { "content-type": "application/json" }, method: "POST" });
      if (!confirmation.ok) throw new Error("confirmation_failed");
      setSlipStatus(th ? "ส่งสลิปแล้ว กำลังรอตรวจสอบ" : "Slip submitted for review.");
    } catch { setError(th ? "อัปโหลดสลิปไม่สำเร็จ กรุณาลองอีกครั้ง" : "Slip upload failed. Please try again."); }
    finally { setPaymentPending(false); }
  }

  return <main className={styles.memberArea}>
    <MemberSidebar active="requests" locale={locale} />
    <section className={styles.pagePanel}>
      <Link className={styles.backLink} href={`/${locale}/member/requests`}>← {th ? "กลับไปยังรายการคำขอ" : "Back to requests"}</Link>
      {loading ? <p className={styles.loadingCopy}>{th ? "กำลังโหลดใบเสนอราคา..." : "Loading quote..."}</p> : null}
      {error ? <p className={styles.errorMessage} role="alert">{error}</p> : null}
      {!loading && !error && !quote ? <p className={styles.emptyCopy}>{th ? "ไม่พบใบเสนอราคาสำหรับคำขอนี้" : "No sent quote is available for this request."}</p> : null}
      {quote ? <MemberQuotePanel locale={locale} onPayDeposit={(handoff) => void startDeposit(handoff)} paymentPending={paymentPending} quote={quote} /> : null}
      {paymentIntent ? <section aria-label="PromptPay deposit" className={styles.depositPanel}><h2>PromptPay · {new Intl.NumberFormat(th ? "th-TH" : "en-US", { style: "currency", currency: "THB" }).format(paymentIntent.amountSatang / 100)}</h2><p>{th ? "ใช้ข้อมูล QR ด้านล่างชำระยอดตามจำนวนที่ระบุ แล้วอัปโหลดสลิป" : "Pay the exact amount using the QR data below, then upload your slip."}</p><code>{paymentIntent.promptPayPayload}</code><label>{th ? "อัปโหลดสลิป" : "Upload slip"}<input accept="image/png,image/jpeg,image/webp" disabled={paymentPending || Boolean(slipStatus)} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadSlip(file); }} type="file" /></label>{slipStatus ? <p role="status">{slipStatus}</p> : null}</section> : null}
    </section>
  </main>;
}

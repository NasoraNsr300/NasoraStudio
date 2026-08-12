"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  MemberQuotePanel,
  type DepositPaymentHandoff,
} from "@/features/member/components/member-quote-panel";
import {
  createMemberQuoteRepository,
  type MemberQuote,
  type MemberQuoteClient,
} from "@/features/member/data/member-quote-repository";
import { useOptionalAuthSession } from "@/shared/auth/auth-session-provider";
import type { Locale } from "@/shared/i18n/locales";
import { createSupabaseBrowserClient } from "@/shared/supabase/client";
import { FileDropzone } from "@/shared/upload/file-dropzone";

import { MemberSidebar } from "./member-sidebar";
import styles from "./member-pages.module.css";

type Props = {
  locale: Locale;
  repository?: ReturnType<typeof createMemberQuoteRepository>;
  requestId: string;
};

type PaymentIntent = { amountSatang: number; paymentId: string } & (
  | { promptPayPayload?: never; slipStatus: "authorized" | "pending_review" }
  | { promptPayPayload: string; slipStatus: "rejected" | "failed" | null }
);

export function MemberRequestQuotePage({
  locale,
  repository,
  requestId,
}: Props) {
  const session = useOptionalAuthSession();
  const repositoryRef = useRef(repository ?? null);
  const [quote, setQuote] = useState<MemberQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentPending, setPaymentPending] = useState(false);
  const [paymentRecoveryPending, setPaymentRecoveryPending] = useState(true);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [slipStatus, setSlipStatus] = useState<string | null>(null);
  const intentRetryRef = useRef<{ fingerprint: string; key: string } | null>(
    null,
  );
  const slipRetryRef = useRef<{ fingerprint: string; key: string } | null>(
    null,
  );
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const th = locale === "th";

  useEffect(() => {
    if (repository) repositoryRef.current = repository;
  }, [repository]);

  const getRepository = useCallback(() => {
    if (!repositoryRef.current) {
      repositoryRef.current = createMemberQuoteRepository(
        createSupabaseBrowserClient() as unknown as MemberQuoteClient,
      );
    }
    return repositoryRef.current;
  }, []);

  useEffect(() => {
    if (session?.status !== "signedIn") return;
    let active = true;
    void getRepository()
      .load(requestId)
      .then((result) => {
        if (!active) return;
        if (result.ok) setQuote(result.data);
        else setError(result.message);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [getRepository, requestId, session?.status]);

  useEffect(() => {
    if (session?.status !== "signedIn" || !quote || paymentIntent) return;
    let active = true;
    void fetch(`/api/member/payments/${quote.id}/intent?requestId=${encodeURIComponent(requestId)}`)
      .then(async (response) => response.ok ? response.json() as Promise<PaymentIntent> : null)
      .then((recovered) => { if (active && recovered) setPaymentIntent(recovered); })
      .catch(() => undefined)
      .finally(() => { if (active) setPaymentRecoveryPending(false); });
    return () => { active = false; };
  }, [paymentIntent, quote, requestId, session?.status]);

  async function startDeposit(handoff: DepositPaymentHandoff) {
    setPaymentPending(true);
    setError(null);
    try {
      const fingerprint = `${handoff.quoteId}:${handoff.requestId}:${handoff.depositSatang}`;
      if (intentRetryRef.current?.fingerprint !== fingerprint)
        intentRetryRef.current = { fingerprint, key: crypto.randomUUID() };
      const response = await fetch(
        `/api/member/payments/${handoff.quoteId}/intent`,
        {
          body: JSON.stringify({
            depositSatang: handoff.depositSatang,
            idempotencyKey: intentRetryRef.current.key,
            requestId: handoff.requestId,
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );
      if (!response.ok) throw new Error("intent_failed");
      const created = (await response.json()) as {
          amountSatang: number;
          paymentId: string;
          promptPayPayload: string;
        };
      setPaymentIntent({ ...created, slipStatus: null });
      intentRetryRef.current = null;
    } catch {
      setError(
        th ? "ไม่สามารถเริ่มการชำระเงินได้" : "Unable to start the payment.",
      );
    } finally {
      setPaymentPending(false);
    }
  }

  async function uploadSlip(file: File) {
    if (!paymentIntent) return;
    setPaymentPending(true);
    setError(null);
    try {
      const fingerprint = `${paymentIntent.paymentId}:${file.name}:${file.size}:${file.lastModified}:${file.type}`;
      if (slipRetryRef.current?.fingerprint !== fingerprint)
        slipRetryRef.current = { fingerprint, key: crypto.randomUUID() };
      const upload = await fetch(
        `/api/member/payments/${paymentIntent.paymentId}/slip-upload`,
        {
          body: file,
          headers: {
            "content-type": file.type,
            "idempotency-key": slipRetryRef.current.key,
          },
          method: "POST",
        },
      );
      if (!upload.ok) throw new Error("upload_failed");
      slipRetryRef.current = null;
      const reviewMessage = th ? "ส่งสลิปแล้ว กำลังรอตรวจสอบ" : "Slip submitted for review.";
      setSlipStatus(reviewMessage);
      setPaymentIntent((current) => current ? { amountSatang: current.amountSatang, paymentId: current.paymentId, slipStatus: "pending_review" } : current);
    } catch {
      setError(
        th
          ? "อัปโหลดสลิปไม่สำเร็จ กรุณาลองอีกครั้ง"
          : "Slip upload failed. Please try again.",
      );
    } finally {
      setSlipFile(null);
      setPaymentPending(false);
    }
  }

  const activeSlip = paymentIntent?.slipStatus === "authorized" || paymentIntent?.slipStatus === "pending_review";

  return (
    <main className={styles.memberArea}>
      <MemberSidebar active="requests" locale={locale} />
      <section className={styles.pagePanel}>
        <Link className={styles.backLink} href={`/${locale}/member/requests`}>
          ← {th ? "กลับไปยังรายการคำขอ" : "Back to requests"}
        </Link>
        {loading ? (
          <p className={styles.loadingCopy}>
            {th ? "กำลังโหลดใบเสนอราคา..." : "Loading quote..."}
          </p>
        ) : null}
        {error ? (
          <p className={styles.errorMessage} role="alert">
            {error}
          </p>
        ) : null}
        {!loading && !error && !quote ? (
          <p className={styles.emptyCopy}>
            {th
              ? "ไม่พบใบเสนอราคาสำหรับคำขอนี้"
              : "No sent quote is available for this request."}
          </p>
        ) : null}
        {quote ? (
          <MemberQuotePanel
            locale={locale}
            onPayDeposit={(handoff) => void startDeposit(handoff)}
            paymentBlocked={Boolean(paymentIntent) || paymentRecoveryPending}
            paymentPending={paymentPending}
            quote={quote}
          />
        ) : null}
        {paymentIntent ? (
          <section
            aria-label="PromptPay deposit"
            className={styles.depositPanel}
          >
            <h2>
              {activeSlip ? (th ? "สถานะเงินมัดจำ" : "Deposit status") : "PromptPay"} ·{" "}
              {new Intl.NumberFormat(th ? "th-TH" : "en-US", {
                style: "currency",
                currency: "THB",
              }).format(paymentIntent.amountSatang / 100)}
            </h2>
            {activeSlip ? (
              <p role="status">{slipStatus ?? (paymentIntent.slipStatus === "pending_review"
                ? (th ? "ส่งสลิปแล้ว กำลังรอตรวจสอบ" : "Slip submitted for review.")
                : (th ? "กำลังดำเนินการอัปโหลดสลิป" : "Slip upload is in progress."))}</p>
            ) : (
              <>
                <p>{th
                  ? "ใช้ข้อมูล QR ด้านล่างชำระยอดตามจำนวนที่ระบุ แล้วอัปโหลดสลิป"
                  : "Pay the exact amount using the QR data below, then upload your slip."}</p>
                <code>{paymentIntent.promptPayPayload}</code>
                <FileDropzone accept="image/png,image/jpeg,image/webp" disabled={paymentPending} file={slipFile} label={th ? "อัปโหลดสลิป" : "Upload slip"} maxBytes={5 * 1024 * 1024} onFileChange={(file) => { setSlipFile(file); if (file) void uploadSlip(file); }} />
              </>
            )}
          </section>
        ) : null}
      </section>
    </main>
  );
}

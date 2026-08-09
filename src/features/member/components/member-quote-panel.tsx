"use client";

import type { MemberQuote } from "@/features/member/data/member-quote-repository";
import type { Locale } from "@/shared/i18n/locales";

import styles from "./member-pages.module.css";

export type DepositPaymentHandoff = {
  depositSatang: number;
  quoteId: string;
  requestId: string;
};

type Props = {
  locale: Locale;
  now?: string;
  onPayDeposit?: (handoff: DepositPaymentHandoff) => void;
  quote: MemberQuote;
};

const copy = {
  en: {
    deposit: "Deposit",
    depositPercent: (percent: number) => `${percent}% deposit`,
    expires: "Expires",
    expired: "This quote has expired.",
    outstanding: "Outstanding after deposit",
    paymentUnavailable: "Deposit payment will be available here shortly.",
    payDeposit: "Pay deposit",
    replaced: "This quote has been replaced by a newer version.",
    scope: "Scope",
    total: "Quote total",
  },
  th: {
    deposit: "เงินมัดจำ",
    depositPercent: (percent: number) => `มัดจำ ${percent}%`,
    expires: "หมดอายุ",
    expired: "ใบเสนอราคานี้หมดอายุแล้ว",
    outstanding: "ยอดคงเหลือหลังชำระมัดจำ",
    paymentUnavailable: "จะสามารถชำระเงินมัดจำได้ที่นี่เร็ว ๆ นี้",
    payDeposit: "ชำระมัดจำ",
    replaced: "ใบเสนอราคานี้ถูกแทนที่ด้วยฉบับใหม่แล้ว",
    scope: "ขอบเขตงาน",
    total: "ราคารวม",
  },
} as const;

function formatThb(satang: number, locale: Locale) {
  const amount = satang / 100;
  const formatter = new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", { maximumFractionDigits: 2, minimumFractionDigits: Number.isInteger(amount) ? 0 : 2 });
  return `฿${formatter.format(amount)}`;
}

function formatApproximateUsd(satang: number) {
  return new Intl.NumberFormat("en-US", { currency: "USD", maximumFractionDigits: 2, minimumFractionDigits: 2, style: "currency" }).format(satang / 100 / 35);
}

export function MemberQuotePanel({ locale, now = new Date().toISOString(), onPayDeposit, quote }: Props) {
  const text = copy[locale];
  const isExpired = quote.status === "expired" || (quote.expiresAt !== null && new Date(quote.expiresAt).getTime() <= new Date(now).getTime());
  const isReplaced = quote.status === "superseded";
  const canPay = !isExpired && !isReplaced && quote.status === "sent";
  const unavailableMessage = isReplaced ? text.replaced : isExpired ? text.expired : null;

  return <section aria-label="Quote and deposit" className={styles.quotePanel}>
    <header className={styles.quoteHeader}><div><small>Quote #{quote.version}</small><h1>{text.total}</h1></div><strong>{formatThb(quote.totalSatang, locale)}</strong></header>
    {unavailableMessage ? <p className={styles.quoteUnavailable} role="status">{unavailableMessage}</p> : null}
    <section className={styles.quoteScope}><h2>{text.scope}</h2><p>{quote.scope[locale]}</p></section>
    <section className={styles.quoteItems} aria-label="Quote items">
      {quote.items.map((item) => <article key={item.id}><div><strong>{item.label[locale]}</strong><small>{item.description[locale]} · ×{item.quantity}</small></div><strong>{formatThb(item.lineTotalSatang, locale)}</strong></article>)}
    </section>
    <section className={styles.quoteBreakdown} aria-label="Price breakdown">
      <div><span>{text.total}</span><strong>{formatThb(quote.totalSatang, locale)}</strong></div>
      <div><span>{text.deposit} · {text.depositPercent(quote.depositPercent)}</span><strong>{formatThb(quote.depositSatang, locale)}</strong></div>
      <div><span>{text.outstanding}</span><strong>{formatThb(quote.outstandingSatang, locale)}</strong></div>
      <small>Approx. USD {formatApproximateUsd(quote.totalSatang)} · THB is authoritative.</small>
    </section>
    {quote.expiresAt ? <p className={styles.quoteMeta}>{text.expires}: {new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(quote.expiresAt))}</p> : null}
    {canPay ? <div className={styles.quoteAction}><button aria-describedby={onPayDeposit ? undefined : "deposit-payment-unavailable"} className={styles.goldButton} disabled={!onPayDeposit} onClick={() => onPayDeposit?.({ depositSatang: quote.depositSatang, quoteId: quote.id, requestId: quote.requestId })} type="button">{text.payDeposit}</button>{!onPayDeposit ? <small id="deposit-payment-unavailable">{text.paymentUnavailable}</small> : null}</div> : null}
  </section>;
}

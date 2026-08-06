"use client";

import { Clock3, FileCheck2, FileText, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  createCommissionRequestRepository,
  type CommissionRequestClient,
  type MemberRequestSummary,
} from "@/features/commission/data/commission-request-repository";
import { useOptionalAuthSession } from "@/shared/auth/auth-session-provider";
import type { AuthIdentity, AuthStatus } from "@/shared/auth/auth-types";
import type { Locale } from "@/shared/i18n/locales";
import { createSupabaseBrowserClient } from "@/shared/supabase/client";

import { MemberSidebar, type MemberSection } from "./member-sidebar";
import styles from "./member-pages.module.css";

type Props = {
  auth?: { status: AuthStatus; user: AuthIdentity | null };
  locale: Locale;
  onSelectSection?: (section: MemberSection) => void;
  repository?: ReturnType<typeof createCommissionRequestRepository>;
};

const statusCopy = {
  en: {
    cancelled: "Cancelled",
    closed: "Closed",
    converted: "Converted to job",
    declined: "Declined",
    quoted: "Quote received",
    reviewing: "Under review",
    submitted: "Awaiting review",
  },
  th: {
    cancelled: "ยกเลิกแล้ว",
    closed: "ปิดรายการแล้ว",
    converted: "สร้างเป็นงานแล้ว",
    declined: "ไม่รับงาน",
    quoted: "ได้รับใบเสนอราคา",
    reviewing: "กำลังตรวจสอบ",
    submitted: "รอตรวจสอบ",
  },
} as const;

function formatBudget(request: MemberRequestSummary, locale: Locale) {
  if (request.budgetMinSatang === null && request.budgetMaxSatang === null) return locale === "th" ? "เปิดงบประมาณ" : "Open budget";
  const formatter = new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US");
  const minimum = request.budgetMinSatang === null ? "0" : formatter.format(request.budgetMinSatang / 100);
  const maximum = request.budgetMaxSatang === null ? "+" : formatter.format(request.budgetMaxSatang / 100);
  return `${minimum}–${maximum} THB`;
}

function statusClass(status: MemberRequestSummary["status"]) {
  if (status === "submitted" || status === "reviewing") return styles.waiting;
  if (status === "quoted") return styles.quoted;
  return styles.closed;
}

export function MemberRequestsContent({ auth, locale, repository }: Omit<Props, "onSelectSection">) {
  const th = locale === "th";
  const contextualAuth = useOptionalAuthSession();
  const session = auth ?? contextualAuth ?? { status: "signedOut" as const, user: null };
  const repositoryRef = useRef(repository ?? null);
  const [requests, setRequests] = useState<MemberRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (repository) repositoryRef.current = repository;
  }, [repository]);

  const getRepository = useCallback(() => {
    if (!repositoryRef.current) {
      repositoryRef.current = createCommissionRequestRepository(
        createSupabaseBrowserClient() as unknown as CommissionRequestClient,
      );
    }
    return repositoryRef.current;
  }, []);

  useEffect(() => {
    if (session.status !== "signedIn") return;
    let active = true;
    void getRepository().listMine().then((result) => {
      if (!active) return;
      if (result.ok) setRequests(result.data);
      else setError(result.message);
      setLoading(false);
    });
    return () => { active = false; };
  }, [getRepository, session.status]);

  const cancelRequest = async (request: MemberRequestSummary) => {
    const prompt = th ? `ยืนยันยกเลิก ${request.requestCode} หรือไม่?` : `Cancel ${request.requestCode}?`;
    if (!window.confirm(prompt)) return;
    setCancellingId(request.id);
    setError(null);
    const result = await getRepository().cancel(request.id);
    if (result.ok) {
      setRequests((current) => current.map((item) => item.id === request.id ? { ...item, status: "cancelled" } : item));
    } else {
      setError(result.message);
    }
    setCancellingId(null);
  };

  const waitingCount = requests.filter((request) => request.status === "submitted" || request.status === "reviewing").length;
  const quotedCount = requests.filter((request) => request.status === "quoted").length;
  const closedCount = requests.length - waitingCount - quotedCount;

  return (
    <section className={styles.pagePanel}>
      <header className={styles.pageHeader}><div><h1>{th ? "แบบประเมินของฉัน" : "My requests"}</h1><p>{th ? "ติดตามแบบประเมิน ใบเสนอราคา และคำขอที่ส่งให้ Nasora" : "Track requests, estimates, and quotes sent to Nasora."}</p></div><button type="button"><Plus size={18} />{th ? "ส่งแบบประเมินใหม่" : "New request"}</button></header>
      <div className={styles.stats}><div className={styles.stat}><span><Clock3 /></span><div><strong>{waitingCount}</strong><small>{th ? "รอตรวจสอบ" : "Awaiting review"}</small></div></div><div className={styles.stat}><span><FileCheck2 /></span><div><strong>{quotedCount}</strong><small>{th ? "ได้รับใบเสนอราคา" : "Quote received"}</small></div></div><div className={styles.stat}><span><FileText /></span><div><strong>{closedCount}</strong><small>{th ? "ปิดรายการแล้ว" : "Closed"}</small></div></div></div>
      <section className={styles.surface}><div className={styles.surfaceTitle}><h2>{th ? "รายการล่าสุด" : "Recent requests"}</h2><span>{requests.length} {th ? "รายการ" : "items"}</span></div>
        {loading ? <p>{th ? "กำลังโหลดแบบประเมิน..." : "Loading requests..."}</p> : null}
        {error ? <p role="alert">{error}</p> : null}
        {!loading && !error && requests.length === 0 ? <p>{th ? "คุณยังไม่ได้ส่งแบบประเมินราคา" : "You have not submitted an estimate request yet."}</p> : null}
        <div className={styles.requestList}>
          {requests.map((request) => {
            const cancellable = request.status === "submitted" || request.status === "reviewing";
            return <article className={styles.requestRow} key={request.id}>
              <div className={styles.requestMain}><strong>{request.serviceName[locale]}</strong><small>{request.requestCode} · {new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { dateStyle: "medium" }).format(new Date(request.submittedAt))}</small></div>
              <div className={styles.requestMeta}><span>{th ? "งบประมาณ" : "Budget"}</span><strong>{formatBudget(request, locale)}</strong></div>
              <span className={`${styles.statusPill} ${statusClass(request.status)}`}>● {statusCopy[locale][request.status]}</span>
              {cancellable ? <button className={styles.rowButton} disabled={cancellingId === request.id} onClick={() => void cancelRequest(request)} type="button">{cancellingId === request.id ? (th ? "กำลังยกเลิก..." : "Cancelling...") : (th ? "ยกเลิกแบบประเมิน" : "Cancel request")}</button> : <span />}
            </article>;
          })}
        </div>
      </section>
    </section>
  );
}

export function MemberRequestsPage({ auth, locale, onSelectSection, repository }: Props) {
  return (
    <main className={styles.memberArea}>
      <MemberSidebar active="requests" locale={locale} onSelectSection={onSelectSection} />
      <MemberRequestsContent auth={auth} locale={locale} repository={repository} />
    </main>
  );
}

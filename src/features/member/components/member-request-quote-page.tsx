"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { MemberQuotePanel } from "@/features/member/components/member-quote-panel";
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

  return <main className={styles.memberArea}>
    <MemberSidebar active="requests" locale={locale} />
    <section className={styles.pagePanel}>
      <Link className={styles.backLink} href={`/${locale}/member/requests`}>← {th ? "กลับไปยังรายการคำขอ" : "Back to requests"}</Link>
      {loading ? <p className={styles.loadingCopy}>{th ? "กำลังโหลดใบเสนอราคา..." : "Loading quote..."}</p> : null}
      {error ? <p className={styles.errorMessage} role="alert">{error}</p> : null}
      {!loading && !error && !quote ? <p className={styles.emptyCopy}>{th ? "ไม่พบใบเสนอราคาสำหรับคำขอนี้" : "No sent quote is available for this request."}</p> : null}
      {quote ? <MemberQuotePanel locale={locale} quote={quote} /> : null}
    </section>
  </main>;
}

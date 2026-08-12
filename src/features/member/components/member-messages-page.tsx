"use client";

import { ImagePlus, Send, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { type FormEvent, useMemo, useState } from "react";

import type { ConversationView } from "@/features/collaboration/data/collaboration-repository.server";
import type { Locale } from "@/shared/i18n/locales";
import { normalizeImageForUpload } from "@/features/media/client/normalize-image-for-upload";

import { MemberSidebar, type MemberSection } from "./member-sidebar";
import styles from "./member-pages.module.css";

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<{ ok: boolean }>;

export function MemberMessagesContent({ conversations = [], fetcher = fetch, locale }: { conversations?: ConversationView[]; fetcher?: Fetcher; locale: Locale }) {
  const [active, setActive] = useState(0);
  const [body, setBody] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const router = useRouter();
  const th = locale === "th";
  const selected = conversations[active] ?? null;
  const rows = useMemo(() => conversations, [conversations]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected || !body.trim() || sending) return;
    setSending(true); setError("");
    try {
      const normalized = image ? await normalizeImageForUpload(image) : null;
      const payload = normalized ? (() => { const data = new FormData(); data.set("body", body); data.set("image", normalized.file); return data; })() : JSON.stringify({ body });
      const response = await fetcher(`/api/member/jobs/${selected.jobId}/messages`, { body: payload, ...(image ? {} : { headers: { "content-type": "application/json" } }), method: "POST" });
      if (!response.ok) throw new Error("send_failed");
      setBody(""); setImage(null); router.refresh();
    } catch { setError(th ? "ส่งข้อความไม่สำเร็จ กรุณาลองอีกครั้ง" : "Could not send. Please retry."); }
    finally { setSending(false); }
  }

  return <section className={`${styles.pagePanel} ${styles.messagePanel}`}>
    <header className={styles.pageHeader}><div><h1>{th ? "ข้อความ" : "Messages"}</h1><p>{th ? "พูดคุยและติดตามรายละเอียดของงานที่กำลังดำเนินการ" : "Discuss and follow the details of your active jobs."}</p></div></header>
    <div className={styles.messagesLayout}>
      <section className={`${styles.surface} ${styles.conversationList}`}>
        <header><input aria-label={th ? "ค้นหาข้อความ" : "Search messages"} placeholder={th ? "ค้นหาข้อความ..." : "Search messages..."} /></header>
        {rows.length === 0 ? <p>{th ? "ยังไม่มีห้องสนทนา ห้องจะเปิดหลังยืนยันมัดจำ" : "No conversations yet. A thread opens after deposit verification."}</p> : rows.map((conversation, index) => {
          const latest = conversation.messages.at(-1);
          return <button aria-pressed={active === index} className={styles.conversation} key={conversation.id} onClick={() => setActive(index)} type="button">
            <span><strong>{conversation.title}</strong><time>{latest ? new Date(latest.createdAt).toLocaleString(locale) : ""}</time></span>
            <span><small>{latest?.body ?? (th ? "เริ่มการสนทนา" : "Start a conversation")}</small></span>
          </button>;
        })}
      </section>
      <section className={`${styles.surface} ${styles.chat}`}>
        <header className={styles.chatHeader}><span><UserRound size={19} /></span><div><strong>Nasora</strong><small>{selected?.title ?? (th ? "เลือกงานเพื่อเริ่มสนทนา" : "Select a job")}</small></div></header>
        <div className={styles.chatBody}>
          {selected?.messages.map((message) => <div className={`${styles.bubble} ${message.senderRole === "member" ? styles.mine : ""}`} key={message.id}>
            {message.imageAssetId ? <Image alt={th ? "รูปภาพในข้อความ" : "Message image"} height={320} src={`/api/member/message-assets/${message.imageAssetId}`} unoptimized width={480} /> : null}<p>{message.body}</p><small>{new Date(message.createdAt).toLocaleString(locale)}</small>
          </div>)}
        </div>
        <form className={styles.chatComposer} onSubmit={submit}>
          <label aria-label={th ? "เพิ่มรูปภาพ" : "Add image"}><ImagePlus size={18} /><input accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => setImage(event.target.files?.[0] ?? null)} type="file" /></label>
          <input disabled={!selected || sending} onChange={(event) => setBody(event.target.value)} placeholder={th ? "พิมพ์ข้อความ..." : "Write a message..."} value={body} />
          <button aria-label={th ? "ส่งข้อความ" : "Send message"} disabled={!selected || !body.trim() || sending} type="submit"><Send size={18} /></button>
        </form>
        {image ? <small>{image.name}</small> : null}
        {error && <p role="alert">{error}</p>}
      </section>
    </div>
  </section>;
}

export function MemberMessagesPage({ conversations = [], locale, onSelectSection }: { conversations?: ConversationView[]; locale: Locale; onSelectSection?: (section: MemberSection) => void }) {
  return <main className={`${styles.memberArea} ${styles.messageArea}`}><MemberSidebar active="messages" locale={locale} onSelectSection={onSelectSection} /><MemberMessagesContent conversations={conversations} locale={locale} /></main>;
}

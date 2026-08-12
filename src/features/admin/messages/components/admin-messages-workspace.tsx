"use client";

import { MessageSquarePlus, Send, Sparkles, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import type { ConversationView } from "@/features/collaboration/data/collaboration-repository.server";
import { normalizeImageForUpload } from "@/features/media/client/normalize-image-for-upload";

import styles from "./admin-messages-workspace.module.css";

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<{ json(): Promise<Record<string, unknown>>; ok: boolean }>;
type Conversation = ConversationView & { customerName?: string };

export function AdminMessagesWorkspace({ conversations, fetcher = fetch }: { conversations: Conversation[]; fetcher?: Fetcher }) {
  const [active, setActive] = useState(0);
  const [body, setBody] = useState("");
  const [messageImage, setMessageImage] = useState<File | null>(null);
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressTitle, setProgressTitle] = useState("");
  const [progressBody, setProgressBody] = useState("");
  const [lightboxAssetId, setLightboxAssetId] = useState<string | null>(null);
  const [unread, setUnread] = useState(() => conversations.map((conversation) => conversation.unreadCount));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const selected = conversations[active] ?? null;

  async function selectConversation(index: number) {
    setActive(index);
    const conversation = conversations[index];
    if (!conversation) return;
    setUnread((values) => values.map((value, current) => current === index ? 0 : value));
    await fetcher("/api/admin/notifications/read", { body: JSON.stringify({ conversationId: conversation.id }), headers: { "content-type": "application/json" }, method: "POST" }).catch(() => undefined);
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!selected || !body.trim() || saving) return;
    setSaving(true); setError("");
    try {
      const normalized = messageImage ? await normalizeImageForUpload(messageImage) : null;
      const payload = normalized ? (() => { const data = new FormData(); data.set("body", body); data.set("image", normalized.file); return data; })() : JSON.stringify({ body });
      const response = await fetcher(`/api/admin/jobs/${selected.jobId}/messages`, { body: payload, ...(messageImage ? {} : { headers: { "content-type": "application/json" } }), method: "POST" });
      if (!response.ok) throw new Error("send_failed");
      setBody(""); setMessageImage(null); router.refresh();
    } catch { setError("ส่งข้อความไม่สำเร็จ ลองอีกครั้ง"); }
    finally { setSaving(false); }
  }

  function requestProgressClose() {
    if ((progressTitle.trim() || progressBody.trim()) && !window.confirm("ปิดโดยไม่บันทึกความคืบหน้าหรือไม่?")) return;
    setProgressOpen(false); setError("");
  }

  useEffect(() => {
    if (!progressOpen && !lightboxAssetId) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (lightboxAssetId) setLightboxAssetId(null);
      else requestProgressClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  async function postProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !progressTitle.trim() || !progressBody.trim() || saving) return;
    setSaving(true); setError("");
    try {
      const data = new FormData(event.currentTarget); const image = data.get("image");
      const hasImage = image instanceof File && image.size > 0;
      if (hasImage) data.set("image", (await normalizeImageForUpload(image)).file);
      const response = await fetcher(`/api/admin/jobs/${selected.jobId}/progress`, { body: hasImage ? data : JSON.stringify({ body: progressBody, title: progressTitle }), ...(hasImage ? {} : { headers: { "content-type": "application/json" } }), method: "POST" });
      if (!response.ok) throw new Error("progress_failed");
      setProgressTitle(""); setProgressBody(""); setProgressOpen(false); router.refresh();
    } catch { setError("บันทึกความคืบหน้าไม่สำเร็จ ลองอีกครั้ง"); }
    finally { setSaving(false); }
  }

  return <section className={styles.page}>
    <header><div><MessageSquarePlus size={26} /><div><h1>ข้อความ</h1><p>พูดคุยกับสมาชิกและบันทึกความคืบหน้าของงาน</p></div></div><button aria-label="เพิ่มความคืบหน้า" disabled={!selected} onClick={() => setProgressOpen(true)} type="button"><Sparkles size={17} />เพิ่มความคืบหน้า</button></header>
    <div className={styles.workspace}>
      <aside>{conversations.length === 0 ? <p>ยังไม่มีงานสมาชิกที่เปิดห้องสนทนา</p> : conversations.map((conversation, index) => <button aria-pressed={active === index} key={conversation.id} onClick={() => void selectConversation(index)} type="button"><span className={styles.roomHeading}><strong>{conversation.customerName ?? "Member"}</strong>{unread[index] ? <b>{unread[index]}</b> : null}</span><span>{conversation.title}</span><small>{conversation.messages.at(-1)?.body ?? "ยังไม่มีข้อความ"}</small></button>)}</aside>
      <section className={styles.thread}>
        <header><strong>{selected?.customerName ?? "เลือกห้องสนทนา"}</strong><span>{selected?.title}</span></header>
        <div className={styles.messages}>{selected?.messages.map((message) => <article data-side={message.senderRole === "admin" ? "admin" : "member"} key={message.id}>{message.imageAssetId ? <button aria-label="ขยายรูปภาพในข้อความ" className={styles.messageImageButton} onClick={() => setLightboxAssetId(message.imageAssetId!)} type="button"><Image alt="รูปภาพในข้อความ" height={320} src={`/api/member/message-assets/${message.imageAssetId}`} unoptimized width={480} /></button> : null}<p>{message.body}</p><time>{new Date(message.createdAt).toLocaleString("th-TH")}</time></article>)}</div>
        <form className={styles.composer} onSubmit={sendMessage}><label>รูป<input accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => setMessageImage(event.target.files?.[0] ?? null)} type="file" /></label><input disabled={!selected || saving} onChange={(event) => setBody(event.target.value)} placeholder="พิมพ์ข้อความ..." value={body} /><button aria-label={saving ? "กำลังส่ง" : "ส่งข้อความ"} disabled={!selected || !body.trim() || saving} type="submit"><Send size={18} /></button></form>
        {error && !progressOpen ? <p role="alert">{error}</p> : null}
      </section>
    </div>

    {progressOpen ? <div className={styles.modalBackdrop} onMouseDown={(event) => { if (event.currentTarget === event.target) requestProgressClose(); }}><section aria-label="เพิ่มความคืบหน้า" aria-modal="true" className={styles.progressModal} role="dialog"><header><div><span>อัปเดตงาน</span><h2>เพิ่มความคืบหน้า</h2></div><button aria-label="ปิด" onClick={requestProgressClose} type="button"><X size={22} /></button></header><form onSubmit={postProgress}><label>หัวข้อความคืบหน้า<input maxLength={160} name="title" onChange={(event) => setProgressTitle(event.target.value)} value={progressTitle} /></label><label>รายละเอียดความคืบหน้า<textarea maxLength={4000} name="body" onChange={(event) => setProgressBody(event.target.value)} value={progressBody} /></label><label>รูปภาพ (ถ้ามี)<input accept="image/png,image/jpeg,image/webp" name="image" type="file" /></label>{error ? <p role="alert">{error}</p> : null}<div><button disabled={saving} onClick={requestProgressClose} type="button">ยกเลิก</button><button disabled={saving || !progressTitle.trim() || !progressBody.trim()} type="submit">{saving ? "กำลังบันทึก..." : "บันทึกความคืบหน้า"}</button></div></form></section></div> : null}
    {lightboxAssetId ? <div aria-label="รูปภาพในข้อความ" aria-modal="true" className={styles.lightbox} onMouseDown={(event) => { if (event.currentTarget === event.target) setLightboxAssetId(null); }} role="dialog"><button aria-label="ปิดรูปภาพ" onClick={() => setLightboxAssetId(null)} type="button"><X size={24} /></button><Image alt="รูปภาพในข้อความขนาดเต็ม" fill sizes="90vw" src={`/api/member/message-assets/${lightboxAssetId}`} unoptimized /></div> : null}
  </section>;
}

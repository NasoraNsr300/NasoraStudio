"use client";

import { MessageSquarePlus, Send, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { type FormEvent, useState } from "react";

import type { ConversationView } from "@/features/collaboration/data/collaboration-repository.server";

import styles from "./admin-messages-workspace.module.css";

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<{ ok: boolean }>;

export function AdminMessagesWorkspace({ conversations, fetcher = fetch }: { conversations: Array<ConversationView & { customerName?: string }>; fetcher?: Fetcher }) {
  const [active, setActive] = useState(0);
  const [body, setBody] = useState("");
  const [messageImage, setMessageImage] = useState<File | null>(null);
  const [mode, setMode] = useState<"message" | "progress">("message");
  const [progressTitle, setProgressTitle] = useState("");
  const [progressBody, setProgressBody] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const selected = conversations[active] ?? null;

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!selected || !body.trim() || saving) return;
    setSaving(true); setError("");
    try {
      const payload = messageImage ? (() => { const data = new FormData(); data.set("body", body); data.set("image", messageImage); return data; })() : JSON.stringify({ body });
      const response = await fetcher(`/api/admin/jobs/${selected.jobId}/messages`, { body: payload, ...(messageImage ? {} : { headers: { "content-type": "application/json" } }), method: "POST" });
      if (!response.ok) throw new Error("send_failed");
      setBody(""); setMessageImage(null); router.refresh();
    } catch { setError("ส่งข้อความไม่สำเร็จ"); }
    finally { setSaving(false); }
  }

  async function postProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !progressTitle.trim() || !progressBody.trim() || saving) return;
    setSaving(true); setError("");
    try {
      const data = new FormData(event.currentTarget); const image = data.get("image");
      const hasImage = image instanceof File && image.size > 0;
      const response = await fetcher(`/api/admin/jobs/${selected.jobId}/progress`, { body: hasImage ? data : JSON.stringify({ body: progressBody, title: progressTitle }), ...(hasImage ? {} : { headers: { "content-type": "application/json" } }), method: "POST" });
      if (!response.ok) throw new Error("progress_failed");
      setProgressTitle(""); setProgressBody(""); setMode("message"); router.refresh();
    } catch { setError("บันทึกความคืบหน้าไม่สำเร็จ"); }
    finally { setSaving(false); }
  }

  return <section className={styles.page}>
    <header><div><MessageSquarePlus size={26} /><div><h1>ข้อความ</h1><p>พูดคุยกับสมาชิกและบันทึกความคืบหน้าของงาน</p></div></div><button aria-label="เพิ่มความคืบหน้า" disabled={!selected} onClick={() => setMode(mode === "progress" ? "message" : "progress")} type="button"><Sparkles size={17} />เพิ่มความคืบหน้า</button></header>
    <div className={styles.workspace}>
      <aside>{conversations.length === 0 ? <p>ยังไม่มีงานสมาชิกที่เปิดห้องสนทนา</p> : conversations.map((conversation, index) => <button aria-pressed={active === index} key={conversation.id} onClick={() => setActive(index)} type="button"><strong>{conversation.customerName ?? "Member"}</strong><span>{conversation.title}</span><small>{conversation.messages.at(-1)?.body ?? "ยังไม่มีข้อความ"}</small></button>)}</aside>
      <section className={styles.thread}>
        <header><strong>{selected?.customerName ?? "เลือกห้องสนทนา"}</strong><span>{selected?.title}</span></header>
        <div className={styles.messages}>{selected?.messages.map((message) => <article data-side={message.senderRole === "admin" ? "admin" : "member"} key={message.id}>{message.imageAssetId ? <Image alt="รูปภาพในข้อความ" height={320} src={`/api/member/message-assets/${message.imageAssetId}`} unoptimized width={480} /> : null}<p>{message.body}</p><time>{new Date(message.createdAt).toLocaleString("th-TH")}</time></article>)}</div>
        {mode === "progress" ? <form className={styles.progressForm} onSubmit={postProgress}><label>หัวข้อความคืบหน้า<input aria-label="หัวข้อความคืบหน้า" maxLength={160} name="title" onChange={(event) => setProgressTitle(event.target.value)} value={progressTitle} /></label><label>รายละเอียดความคืบหน้า<textarea aria-label="รายละเอียดความคืบหน้า" maxLength={4000} name="body" onChange={(event) => setProgressBody(event.target.value)} value={progressBody} /></label><label>รูปภาพ (ถ้ามี)<input accept="image/png,image/jpeg,image/webp" name="image" type="file" /></label><button disabled={saving} type="submit">บันทึกความคืบหน้า</button></form> : <form className={styles.composer} onSubmit={sendMessage}><label>รูป<input accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => setMessageImage(event.target.files?.[0] ?? null)} type="file" /></label><input disabled={!selected || saving} onChange={(event) => setBody(event.target.value)} placeholder="พิมพ์ข้อความ..." value={body} /><button aria-label="ส่งข้อความ" disabled={!selected || !body.trim() || saving} type="submit"><Send size={18} /></button></form>}
        {error && <p role="alert">{error}</p>}
      </section>
    </div>
  </section>;
}

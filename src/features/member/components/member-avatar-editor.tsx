"use client";

import { ImageUp, LoaderCircle } from "lucide-react";
import { type DragEvent, useEffect, useId, useState } from "react";

import { normalizeMemberAvatar } from "@/features/member/client/normalize-member-avatar";
import { MEMBER_AVATAR_SOURCE_LIMIT_BYTES, MEMBER_AVATAR_SOURCE_TYPES } from "@/features/member/domain/member-avatar";
import { MemberAvatar } from "@/shared/components/member-avatar/member-avatar";
import type { Locale } from "@/shared/i18n/locales";

import styles from "./member-pages.module.css";

export function MemberAvatarEditor({ avatarMediaId, fetcher = fetch, locale, nickname, onUploaded }: { avatarMediaId: string | null | undefined; fetcher?: typeof fetch; locale: Locale; nickname: string; onUploaded(mediaId: string): void }) {
  const th = locale === "th"; const id = useId();
  const [file, setFile] = useState<File | null>(null); const [preview, setPreview] = useState<string | null>(null); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const [dragging, setDragging] = useState(false);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function choose(source: File | null) {
    if (!source) return;
    setMessage(""); setBusy(true);
    try {
      const normalized = await normalizeMemberAvatar(source);
      if (preview) URL.revokeObjectURL(preview);
      setFile(normalized.file); setPreview(URL.createObjectURL(normalized.file));
    } catch { setMessage(th ? "กรุณาเลือกไฟล์ PNG, JPEG หรือ WebP ขนาดไม่เกิน 5 MB" : "Choose a PNG, JPEG, or WebP file up to 5 MB"); }
    finally { setBusy(false); }
  }

  function drop(event: DragEvent<HTMLLabelElement>) { event.preventDefault(); setDragging(false); void choose(event.dataTransfer.files[0] ?? null); }

  async function upload() {
    if (!file || busy) return;
    setBusy(true); setMessage("");
    try {
      const form = new FormData(); form.set("file", file);
      const response = await fetcher("/api/member/profile/avatar", { body: form, method: "POST" });
      const payload = await response.json().catch(() => null) as { avatarMediaId?: unknown; error?: unknown } | null;
      if (!response.ok || typeof payload?.avatarMediaId !== "string") throw new Error("upload_failed");
      onUploaded(payload.avatarMediaId); setFile(null); setPreview(null); setMessage(th ? "อัปเดตรูปโปรไฟล์แล้ว" : "Profile image updated");
    } catch { setMessage(th ? "อัปโหลดรูปไม่สำเร็จ กรุณาลองอีกครั้ง" : "Unable to upload image. Try again."); }
    finally { setBusy(false); }
  }

  return <div className={styles.avatarEditor}>
    {preview ? <img alt={th ? "ตัวอย่างรูปโปรไฟล์" : "Profile image preview"} className={styles.avatarPreview} src={preview} /* eslint-disable-line @next/next/no-img-element */ /> : <MemberAvatar avatarMediaId={avatarMediaId} className={styles.avatarPreview} nickname={nickname} />}
    <div className={styles.avatarUploadControls}>
      <label className={styles.avatarDropzone} data-dragging={dragging} data-testid="avatar-dropzone" htmlFor={id} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDragOver={(event) => event.preventDefault()} onDrop={drop}>
        <ImageUp size={18} /><span>{th ? "ลากรูปมาวาง หรือคลิกเพื่อเลือก" : "Drop an image or click to select"}<small>PNG · JPEG · WebP · 5 MB</small></span>
      </label>
      <input accept={MEMBER_AVATAR_SOURCE_TYPES.join(",")} aria-label={th ? "เลือกรูปโปรไฟล์" : "Choose profile image"} className={styles.avatarFileInput} disabled={busy} id={id} onChange={(event) => void choose(event.target.files?.[0] ?? null)} type="file" />
      <button className={styles.outlineButton} disabled={!file || busy || file.size > MEMBER_AVATAR_SOURCE_LIMIT_BYTES} onClick={() => void upload()} type="button">{busy ? <LoaderCircle aria-hidden="true" size={15} /> : null}{th ? "อัปโหลดรูปโปรไฟล์" : "Upload profile image"}</button>
      {message ? <p aria-live="polite" className={styles.avatarMessage} role={message.includes("สำเร็จ") || message.includes("updated") ? "status" : "alert"}>{message}</p> : null}
    </div>
  </div>;
}

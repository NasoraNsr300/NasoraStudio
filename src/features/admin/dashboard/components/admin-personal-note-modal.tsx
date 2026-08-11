"use client";

import { PenLine, X } from "lucide-react";
import { useEffect, useState } from "react";

import styles from "@/features/admin/components/admin-dashboard.module.css";

export function AdminPersonalNoteModal({ initialNote }: { initialNote: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(initialNote);
  const [savedNote, setSavedNote] = useState(initialNote);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function close() {
    if (note !== savedNote && !window.confirm("ปิดโดยไม่บันทึกการแก้ไขหรือไม่?")) return;
    setNote(savedNote);
    setError("");
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  async function save() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/personal-note", {
        body: JSON.stringify({ note }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const body = await response.json() as { error?: string; note?: string };
      if (!response.ok || typeof body.note !== "string") throw new Error(body.error ?? "บันทึกโน้ตไม่สำเร็จ");
      setNote(body.note);
      setSavedNote(body.note);
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "บันทึกโน้ตไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return <>
    <section className={styles.railPanel}>
      <div className={styles.railTitle}>
        <h2>โน้ตส่วนตัว</h2>
        <button aria-label="แก้ไขโน้ตส่วนตัว" className={styles.noteEditButton} onClick={() => setOpen(true)} type="button"><PenLine size={18} /></button>
      </div>
      <p>{savedNote || "ยังไม่มีโน้ตส่วนตัว"}</p>
    </section>
    {open ? <div className={styles.modalBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section aria-labelledby="personal-note-title" aria-modal="true" className={styles.noteModal} role="dialog">
        <div className={styles.noteModalHeading}>
          <div><span>โน้ตส่วนตัว</span><h2 id="personal-note-title">แก้ไขโน้ต Dashboard</h2></div>
          <button aria-label="ปิด" onClick={close} type="button"><X size={22} /></button>
        </div>
        <label htmlFor="personal-note">โน้ตสำหรับคุณคนเดียว</label>
        <textarea autoFocus id="personal-note" maxLength={2_000} onChange={(event) => setNote(event.target.value)} rows={7} value={note} />
        <small>{note.length.toLocaleString("th-TH")} / 2,000</small>
        {error ? <p role="alert">{error}</p> : null}
        <div className={styles.noteModalActions}>
          <button disabled={saving} onClick={close} type="button">ยกเลิก</button>
          <button disabled={saving} onClick={save} type="button">{saving ? "กำลังบันทึก..." : "บันทึก"}</button>
        </div>
      </section>
    </div> : null}
  </>;
}

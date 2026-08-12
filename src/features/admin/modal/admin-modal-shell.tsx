"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import styles from "./admin-modal-shell.module.css";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function AdminModalShell({
  children,
  mode,
  onClose,
  title,
}: {
  children: ReactNode;
  mode: "center" | "fullscreen";
  onClose?: () => void;
  title: string;
}) {
  const router = useRouter();
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const leave = useCallback(() => {
    if (onClose) onClose();
    else router.back();
  }, [onClose, router]);

  const requestClose = useCallback(() => {
    if (dirty) setConfirming(true);
    else leave();
  }, [dirty, leave]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (confirming) setConfirming(false);
      else requestClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [confirming, requestClose]);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function markDirty(event: FormEvent<HTMLElement>) {
    if ((event.target as HTMLElement).matches("input, select, textarea, [contenteditable='true']")) setDirty(true);
  }

  function keepFocusInside(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab") return;
    const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
      .filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
    if (focusable.length === 0) { event.preventDefault(); panelRef.current?.focus(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function closeFromBackdrop(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.currentTarget === event.target) requestClose();
  }

  return <div className={styles.backdrop} data-mode={mode} onMouseDown={closeFromBackdrop}>
    <section
      aria-labelledby={titleId}
      aria-modal="true"
      className={styles.panel}
      onChangeCapture={markDirty}
      onInputCapture={markDirty}
      onKeyDown={keepFocusInside}
      ref={panelRef}
      role="dialog"
      tabIndex={-1}
    >
      <header className={styles.heading}><h2 id={titleId}>{title}</h2><button aria-label="ปิดหน้าต่าง" onClick={requestClose} type="button"><X size={24} /></button></header>
      <div className={styles.content}>{children}</div>
    </section>
    {confirming ? <div className={styles.confirmBackdrop}>
      <section aria-label="ออกโดยไม่บันทึก?" aria-modal="true" className={styles.confirm} role="alertdialog">
        <h2>ออกโดยไม่บันทึก?</h2>
        <p>ข้อมูลที่แก้ไขในหน้าต่างนี้จะหายไป</p>
        <div><button onClick={() => setConfirming(false)} type="button">กลับไปแก้ไข</button><button className={styles.danger} onClick={leave} type="button">ออกโดยไม่บันทึก</button></div>
      </section>
    </div> : null}
  </div>;
}

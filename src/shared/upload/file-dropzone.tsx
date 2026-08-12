"use client";

import { FileUp, Trash2 } from "lucide-react";
import { type DragEvent, useEffect, useId, useRef, useState } from "react";

import styles from "./file-dropzone.module.css";

function formatBytes(bytes: number) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
function matchesAccept(file: File, accept?: string) { if (!accept) return true; return accept.split(",").map((value) => value.trim().toLowerCase()).some((rule) => rule.startsWith(".") ? file.name.toLowerCase().endsWith(rule) : rule.endsWith("/*") ? file.type.toLowerCase().startsWith(rule.slice(0, -1)) : file.type.toLowerCase() === rule); }

function FilePreview({ file }: { file: File }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => setSrc(typeof reader.result === "string" ? reader.result : ""));
    reader.readAsDataURL(file);
    return () => reader.abort();
  }, [file]);

  if (!file.type.startsWith("image/")) return <FileUp size={18} />;
  return <span aria-label={`ตัวอย่าง ${file.name}`} className={styles.preview} role="img" style={src ? { backgroundImage: `url(${src})` } : undefined} />;
}

export function FileDropzone({ accept, disabled, file: controlledFile, label, maxBytes, name, onFileChange }: { accept?: string; disabled?: boolean; file?: File | null; label: string; maxBytes?: number; name?: string; onFileChange?(file: File | null): void }) {
  const id = useId(); const inputRef = useRef<HTMLInputElement>(null); const [internalFile, setInternalFile] = useState<File | null>(null); const [dragging, setDragging] = useState(false); const [error, setError] = useState("");
  const file = controlledFile === undefined ? internalFile : controlledFile;
  useEffect(() => { if (controlledFile === null && inputRef.current) inputRef.current.value = ""; }, [controlledFile]);
  function choose(next: File | null) { if (next && !matchesAccept(next, accept)) { setError("ชนิดไฟล์ไม่รองรับ"); return; } if (next && maxBytes && next.size > maxBytes) { setError(`ไฟล์ใหญ่เกิน ${formatBytes(maxBytes)}`); return; } setError(""); setInternalFile(next); onFileChange?.(next); }
  function drop(event: DragEvent<HTMLLabelElement>) { event.preventDefault(); setDragging(false); if (disabled) return; const next = event.dataTransfer.files[0] ?? null; if (next && inputRef.current && typeof DataTransfer !== "undefined") { const transfer = new DataTransfer(); transfer.items.add(next); inputRef.current.files = transfer.files; } choose(next); }
  function clear() { if (inputRef.current) inputRef.current.value = ""; choose(null); }
  return <div className={styles.root}><span className={styles.label}>{label}</span><label className={styles.zone} data-dragging={dragging} data-testid="file-dropzone" htmlFor={id} onDragEnter={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }} onDragLeave={() => setDragging(false)} onDragOver={(event) => event.preventDefault()} onDrop={drop}><FileUp size={28} /><span><strong>ลากไฟล์มาวาง หรือคลิกเพื่อเลือก</strong><small>{maxBytes ? `ขนาดสูงสุด ${formatBytes(maxBytes)}` : "เลือกไฟล์จากเครื่อง"}</small></span></label><input accept={accept} aria-label={label} className={styles.input} disabled={disabled} id={id} name={name} onChange={(event) => choose(event.target.files?.[0] ?? null)} ref={inputRef} type="file" />{file ? <div className={styles.file}><FilePreview file={file} /><div><strong>{file.name}</strong><small>{formatBytes(file.size)}</small></div><button aria-label={`ลบไฟล์ ${file.name}`} onClick={clear} type="button"><Trash2 size={15} /></button></div> : null}{error ? <p className={styles.error} role="alert">{error}</p> : null}</div>;
}

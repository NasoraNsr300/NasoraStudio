"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

import styles from "@/features/admin/components/admin-dashboard.module.css";

export function AdminGlobalSearch() {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  useEffect(() => {
    function shortcut(event: KeyboardEvent) { if (event.ctrlKey && event.key === "/") { event.preventDefault(); input.current?.focus(); } }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  function submit(event: FormEvent) { event.preventDefault(); const value = query.trim(); if (value) router.push(`/admin/search?q=${encodeURIComponent(value)}`); }
  return <form className={styles.globalSearch} onSubmit={submit}><Search size={22} /><input aria-label="ค้นหาในหลังบ้าน" onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาลูกค้า, งาน, แบบประเมิน, สลิป..." ref={input} value={query} /><kbd>Ctrl /</kbd></form>;
}

"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import styles from "@/features/admin/components/admin-dashboard.module.css";
import { createSupabaseBrowserClient } from "@/shared/supabase/client";

export function AdminAccountMenu({ email, imageUrl }: { email: string; imageUrl: string | null }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  async function signOut() { await createSupabaseBrowserClient().auth.signOut(); router.push("/th"); router.refresh(); }
  return <div className={styles.adminAccountRoot}>
    <button aria-expanded={open} aria-label="บัญชีผู้ดูแลระบบ" className={styles.adminAccountButton} onClick={() => setOpen((value) => !value)} type="button">{imageUrl ? <Image alt="Nasora" height={39} src={imageUrl} unoptimized width={39} /> : <span>N</span>}<strong>Nasora</strong><ChevronDown size={18} /></button>
    {open ? <section className={styles.adminAccountMenu}><strong>{email}</strong><Link href="/th">ไปหน้าเว็บไซต์</Link><Link href="/admin/settings">ตั้งค่า</Link><button onClick={() => void signOut()} type="button">ออกจากระบบ</button></section> : null}
  </div>;
}

"use client";

import { ClipboardList, CreditCard, FileText, FolderKanban, ImageIcon, LayoutDashboard, MessageSquare, Settings, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import styles from "@/features/admin/components/admin-dashboard.module.css";

const menuItems = [
  ["Dashboard", "/admin", LayoutDashboard], ["แบบประเมิน", "/admin/estimates", ClipboardList], ["งานและคิว", "/admin/jobs", FolderKanban],
  ["การชำระเงิน", "/admin/payments", CreditCard], ["ข้อความ", "/admin/messages", MessageSquare], ["อัลบั้มและราคา", "/admin/catalog", SlidersHorizontal],
  ["ผลงาน", "/admin/portfolio", ImageIcon], ["เอกสาร", "/admin/documents", FileText], ["ตั้งค่า", "/admin/settings", Settings],
] as const;

function active(pathname: string, href: string) { return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`); }

export function AdminSidebar({ adminImageUrl, collapsed, onToggle, unreadMessages }: { adminImageUrl: string | null; collapsed: boolean; onToggle(): void; unreadMessages: number }) {
  const pathname = usePathname();
  return <aside className={styles.sidebar} data-collapsed={collapsed}>
    <div className={styles.adminBrand}><span>✧</span><div><strong>NASORA</strong><small>ADMIN</small></div></div>
    <div className={styles.artistCard}>{adminImageUrl ? <Image alt="Nasora" height={58} src={adminImageUrl} unoptimized width={58} /> : <span className={styles.adminAvatarFallback}>N</span>}<div><strong>Nasora</strong><span>SOLO ARTIST</span><small>● ออนไลน์</small></div></div>
    <nav aria-label="เมนูผู้ดูแลระบบ">{menuItems.map(([label, href, Icon]) => <Link aria-current={active(pathname, href) ? "page" : undefined} href={href} key={href} title={collapsed ? label : undefined}><Icon size={20} /><span>{label}</span>{href === "/admin/messages" && unreadMessages > 0 ? <b>{unreadMessages > 99 ? "99+" : unreadMessages}</b> : null}</Link>)}</nav>
    <button aria-label={collapsed ? "แสดงเมนู" : "ซ่อนเมนู"} className={styles.collapse} onClick={onToggle} type="button"><span>←</span><span>ซ่อนเมนู</span><span>≪</span></button>
  </aside>;
}

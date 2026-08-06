"use client";

import {
  Bell,
  ChevronDown,
  ClipboardList,
  CreditCard,
  FileText,
  FolderKanban,
  ImageIcon,
  LayoutDashboard,
  Leaf,
  Menu,
  MessageSquare,
  Moon,
  Search,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";

import type { ThemeName } from "@/shared/theme/theme";

import styles from "./admin-dashboard.module.css";

const menuItems = [
  ["Dashboard", "/admin", LayoutDashboard],
  ["แบบประเมิน", "/admin/estimates", ClipboardList],
  ["งานและคิว", "/admin/jobs", FolderKanban],
  ["การชำระเงิน", "/admin/payments", CreditCard],
  ["ข้อความ", "/admin/messages", MessageSquare],
  ["อัลบั้มและราคา", "/admin/catalog", SlidersHorizontal],
  ["ผลงาน", "/admin/portfolio", ImageIcon],
  ["เอกสาร", "/admin/documents", FileText],
  ["ตั้งค่า", "/admin/settings", Settings],
] as const;

function currentTheme(): ThemeName {
  return document.documentElement.dataset.theme === "autumn" ? "autumn" : "night";
}

function subscribeToTheme(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function pathIsActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname === "/admin";
  const theme = useSyncExternalStore(subscribeToTheme, currentTheme, () => "night");

  function setTheme(nextTheme: ThemeName) {
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("nasora-theme", nextTheme);
  }

  return <div className={`${styles.adminShell} ${isDashboard ? styles.dashboardShell : ""}`}>
    <aside className={styles.sidebar}>
      <div className={styles.adminBrand}><span>✧</span><div><strong>NASORA</strong><small>ADMIN</small></div></div>
      <div className={styles.artistCard}>
        {/* eslint-disable-next-line @next/next/no-img-element -- local fixture for the dashboard mockup */}
        <img alt="Nasora" src="/fixtures/derivatives/moonlit-thumbnail.webp" />
        <div><strong>Nasora</strong><span>SOLO ARTIST</span><small>● ออนไลน์</small></div>
      </div>
      <nav aria-label="เมนูผู้ดูแลระบบ">
        {menuItems.map(([label, href, Icon]) => <Link aria-current={pathIsActive(pathname, href) ? "page" : undefined} href={href} key={href}>
          <Icon size={20} /><span>{label}</span>{label === "ข้อความ" ? <b>5</b> : null}
        </Link>)}
      </nav>
      <button className={styles.collapse} type="button"><span>←</span> ซ่อนเมนู <span>≪</span></button>
    </aside>

    <div className={styles.workspace}>
      <header className={styles.topbar}>
        <button aria-label="เปิดเมนู" className={styles.menuButton} type="button"><Menu size={25} /></button>
        <label className={styles.globalSearch}><Search size={22} /><input placeholder="ค้นหาลูกค้า, งาน, แบบประเมิน, สลิป..." /><kbd>Ctrl /</kbd></label>
        <div className={styles.topActions}>
          <span>เปิดรับงาน</span><button aria-label="สถานะเปิดรับงาน" aria-pressed="true" className={styles.toggle} type="button"><i /></button>
          <div aria-label="ธีมหลังบ้าน" className={styles.adminThemeControls} role="group">
            <button aria-pressed={theme === "night"} onClick={() => setTheme("night")} type="button"><Moon size={15} />Night</button>
            <button aria-pressed={theme === "autumn"} onClick={() => setTheme("autumn")} type="button"><Leaf size={15} />Autumn</button>
          </div>
          <button aria-label="การแจ้งเตือน" className={styles.bell} type="button"><Bell size={23} /><i /></button>
          {/* eslint-disable-next-line @next/next/no-img-element -- local fixture for the dashboard mockup */}
          <img alt="Nasora" src="/fixtures/derivatives/moonlit-thumbnail.webp" /><strong>Nasora</strong><ChevronDown size={18} />
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  </div>;
}

"use client";

import { Leaf, Menu, Moon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";

import type { AdminShellData } from "@/features/admin/notifications/domain/admin-notification";
import { AdminNotificationMenu } from "@/features/admin/notifications/components/admin-notification-menu";
import { AdminAccountMenu } from "@/features/admin/shell/components/admin-account-menu";
import { AdminGlobalSearch } from "@/features/admin/shell/components/admin-global-search";
import { AdminSidebar } from "@/features/admin/shell/components/admin-sidebar";
import { CommissionAvailabilityToggle } from "@/features/site-settings/components/commission-availability-toggle";
import type { ThemeName } from "@/shared/theme/theme";

import styles from "./admin-dashboard.module.css";

function currentTheme(): ThemeName { return document.documentElement.dataset.theme === "autumn" ? "autumn" : "night"; }
function subscribeToTheme(onStoreChange: () => void) { const observer = new MutationObserver(onStoreChange); observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] }); return () => observer.disconnect(); }
function currentSidebar() {
  const stored = window.localStorage.getItem("nasora-admin-sidebar-collapsed");
  if (stored !== null) return stored === "true";
  return typeof window.matchMedia === "function" && window.matchMedia("(max-width: 720px)").matches;
}
function subscribeToSidebar(onStoreChange: () => void) { window.addEventListener("nasora:admin-sidebar", onStoreChange); return () => window.removeEventListener("nasora:admin-sidebar", onStoreChange); }

export function AdminShell({ children, data, initialCommissionsOpen = true }: { children: ReactNode; data: AdminShellData; initialCommissionsOpen?: boolean }) {
  const pathname = usePathname();
  const isDashboard = pathname === "/admin";
  const theme = useSyncExternalStore(subscribeToTheme, currentTheme, () => "night");
  const collapsed = useSyncExternalStore(subscribeToSidebar, currentSidebar, () => false);
  function setTheme(nextTheme: ThemeName) { document.documentElement.dataset.theme = nextTheme; window.localStorage.setItem("nasora-theme", nextTheme); }
  function toggleSidebar() { window.localStorage.setItem("nasora-admin-sidebar-collapsed", String(!collapsed)); window.dispatchEvent(new Event("nasora:admin-sidebar")); }

  return <div className={`${styles.adminShell} ${collapsed ? styles.adminShellCollapsed : ""} ${isDashboard ? styles.dashboardShell : ""}`}>
    <AdminSidebar adminImageUrl={data.adminImageUrl} collapsed={collapsed} onToggle={toggleSidebar} unreadMessages={data.unreadMessages} />
    <div className={styles.workspace}>
      <header className={styles.topbar}>
        <button aria-label="สลับเมนูด้านข้าง" className={styles.menuButton} onClick={toggleSidebar} type="button"><Menu size={25} /></button>
        <AdminGlobalSearch />
        <div className={styles.topActions}>
          <CommissionAvailabilityToggle className={styles.toggle} initialOpen={initialCommissionsOpen} showStatusLabel />
          <div aria-label="ธีมหลังบ้าน" className={styles.adminThemeControls} role="group"><button aria-pressed={theme === "night"} onClick={() => setTheme("night")} type="button"><Moon size={15} />Night</button><button aria-pressed={theme === "autumn"} onClick={() => setTheme("autumn")} type="button"><Leaf size={15} />Autumn</button></div>
          <AdminNotificationMenu initialItems={data.notifications} />
          <AdminAccountMenu email={data.adminEmail} imageUrl={data.adminImageUrl} />
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  </div>;
}

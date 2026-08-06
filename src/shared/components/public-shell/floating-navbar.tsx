"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState, useSyncExternalStore } from "react";

import type { Locale } from "@/shared/i18n/locales";
import { getDictionary } from "@/shared/i18n/dictionaries";
import { IconButton } from "@/shared/components/primitives/icon-button";
import type { ThemeName } from "@/shared/theme/theme";

import { Sidebar } from "./sidebar";
import styles from "./public-shell.module.css";

type FloatingNavbarProps = {
  locale: Locale;
  availability?: "open" | "closed";
};

function currentTheme(): ThemeName {
  return document.documentElement.dataset.theme === "autumn" ? "autumn" : "night";
}

function subscribeToTheme(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export function getAlternateLocalePath(pathname: string | null, currentLocale: Locale, nextLocale: Locale): string {
  if (!pathname) return `/${nextLocale}`;
  const prefix = `/${currentLocale}`;
  if (pathname === prefix || pathname === `${prefix}/`) {
    return `/${nextLocale}`;
  }
  if (pathname.startsWith(`${prefix}/`)) {
    return `/${nextLocale}${pathname.slice(prefix.length)}`;
  }
  return `/${nextLocale}`;
}

function getSearchConfig(locale: Locale, pathname: string | null) {
  const basePath = `/${locale}`;
  const route = pathname ?? basePath;
  if (route.startsWith(`${basePath}/portfolio`)) return { action: `${basePath}/portfolio`, label: locale === "th" ? "ค้นหาผลงาน" : "Search portfolio" };
  if (route.startsWith(`${basePath}/commission`)) return { action: `${basePath}/commission`, label: locale === "th" ? "ค้นหาคอมมิชชัน" : "Search commissions" };
  if (route.startsWith(`${basePath}/queue`)) return { action: `${basePath}/queue`, label: locale === "th" ? "ค้นหาคิว" : "Search queue" };
  if (route.startsWith(`${basePath}/documents`)) return { action: `${basePath}/documents`, label: locale === "th" ? "ค้นหาเอกสาร" : "Search documents" };
  return { action: basePath, label: locale === "th" ? "ค้นหา Nasora" : "Search Nasora" };
}

export function FloatingNavbar({ locale, availability = "open" }: FloatingNavbarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const theme = useSyncExternalStore(subscribeToTheme, currentTheme, () => "night");
  const dictionary = getDictionary(locale);
  const alternateLocale = locale === "th" ? "en" : "th";
  const pathname = usePathname();
  const search = getSearchConfig(locale, pathname);
  const alternatePath = getAlternateLocalePath(pathname, locale, alternateLocale);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const setTheme = (nextTheme: ThemeName) => {
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("nasora-theme", nextTheme);
  };

  return (
    <>
      <div className={styles.navbarFootprint} data-navbar-footprint="true">
      <header className={styles.navbar}>
        <div className={styles.navIdentity}>
          <IconButton aria-label={dictionary.menu} className={styles.iconButton} onClick={() => setSidebarOpen(true)}>
            ☰
          </IconButton>
          <Link aria-label="Nasora home" className={styles.brand} href={`/${locale}`}>NASORA</Link>
        </div>
        <form action={search.action} aria-label={search.label} className={styles.search} role="search">
          <label className={styles.visuallyHidden} htmlFor="nasora-search">{search.label}</label>
          <input id="nasora-search" name="q" placeholder={search.label} type="search" />
        </form>
        <div className={styles.navActions}>
          <span className={styles.availability} data-state={availability}>
            <span aria-hidden="true" className={styles.statusDot} />
            {availability.toUpperCase()}
          </span>
          <Link className={styles.queueLink} href={`/${locale}/queue`}>
            <span aria-hidden="true">▣</span>
            {locale === "th" ? "ดูคิวงาน" : "Queue"}
          </Link>
          <span className={styles.localeControl}>
            <strong>{locale.toUpperCase()}</strong>
            <span aria-hidden="true">/</span>
            <a className={styles.languageLink} href={alternatePath}>{alternateLocale.toUpperCase()}</a>
          </span>
          <span className={styles.themeControls}>
            <button aria-pressed={theme === "night"} data-active={theme === "night"} onClick={() => setTheme("night")} type="button">
              <span aria-hidden="true">☾</span> Night
            </button>
            <button aria-pressed={theme === "autumn"} data-active={theme === "autumn"} onClick={() => setTheme("autumn")} type="button">
              <span aria-hidden="true">🍂</span> Autumn
            </button>
          </span>
        </div>
      </header>
      </div>
      <Sidebar locale={locale} onClose={closeSidebar} open={sidebarOpen} />
    </>
  );
}

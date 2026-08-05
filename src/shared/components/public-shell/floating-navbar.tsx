"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

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
  const search = getSearchConfig(locale, usePathname());

  const toggleTheme = () => {
    const nextTheme = currentTheme() === "night" ? "autumn" : "night";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("nasora-theme", nextTheme);
  };

  return (
    <>
      <header className={styles.navbar}>
        <IconButton aria-label={dictionary.menu} className={styles.iconButton} onClick={() => setSidebarOpen(true)}>
          ☰
        </IconButton>
        <Link aria-label="Nasora home" className={styles.brand} href={`/${locale}`}>NASORA</Link>
        <form action={search.action} aria-label={search.label} className={styles.search} role="search">
          <label className={styles.visuallyHidden} htmlFor="nasora-search">{search.label}</label>
          <input id="nasora-search" name="q" placeholder={search.label} type="search" />
        </form>
        <span className={styles.availability} data-state={availability}>{availability.toUpperCase()}</span>
        <Link className={styles.queueLink} href={`/${locale}/queue`}>{dictionary.queue}</Link>
        <Link className={styles.languageLink} href={`/${alternateLocale}`}>{alternateLocale.toUpperCase()}</Link>
        <IconButton aria-label={`${dictionary.theme}: ${theme}`} className={styles.iconButton} onClick={toggleTheme}>
          {theme === "night" ? "☾" : "☀"}
        </IconButton>
      </header>
      <Sidebar locale={locale} onClose={() => setSidebarOpen(false)} open={sidebarOpen} />
    </>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import type { Locale } from "@/shared/i18n/locales";
import { getDictionary } from "@/shared/i18n/dictionaries";
import { IconButton } from "@/shared/components/primitives/icon-button";

import styles from "./public-shell.module.css";

type SidebarProps = {
  locale: Locale;
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ locale, open, onClose }: SidebarProps) {
  const panelRef = useRef<HTMLElement>(null);
  const dictionary = getDictionary(locale);

  useEffect(() => {
    if (!open) {
      return;
    }

    const panel = panelRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = () => Array.from(panel?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const items = focusable();
      const first = items[0];
      const last = items.at(-1);
      if (!first || !last) {
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const firstItem = focusable()[0];
    firstItem?.focus();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  return (
    <div aria-hidden={!open} className={styles.sidebarLayer} hidden={!open}>
      <button aria-label="Close menu backdrop" className={styles.sidebarBackdrop} onClick={onClose} type="button" />
      <aside aria-label="Site navigation" className={styles.sidebar} ref={panelRef}>
        <IconButton aria-label={dictionary.closeMenu} className={styles.iconButton} onClick={onClose}>
          ×
        </IconButton>
        <nav className={styles.sidebarNav}>
          <Link href={`/${locale}`}>Home</Link>
          <Link href={`/${locale}/portfolio`}>Portfolio</Link>
          <Link href={`/${locale}/commission`}>Commission</Link>
          <Link href={`/${locale}/queue`}>{dictionary.queue}</Link>
          <Link href={`/${locale}/documents`}>Documents</Link>
        </nav>
        <button className={styles.sidebarLogin} type="button">Log in</button>
      </aside>
    </div>
  );
}

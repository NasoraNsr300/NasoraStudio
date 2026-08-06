"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import type { Locale } from "@/shared/i18n/locales";
import { getDictionary } from "@/shared/i18n/dictionaries";
import { IconButton } from "@/shared/components/primitives/icon-button";

import { useAuthPreview } from "./auth-preview";
import styles from "./public-shell.module.css";

type SidebarProps = {
  locale: Locale;
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ locale, open, onClose }: SidebarProps) {
  const panelRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const dictionary = getDictionary(locale);
  const { open: authOpen, show } = useAuthPreview();
  const authOpenRef = useRef(authOpen);
  const pathname = usePathname();
  const links = [
    { href: `/${locale}`, label: dictionary.home },
    { href: `/${locale}/portfolio`, label: dictionary.portfolio },
    { href: `/${locale}/commission`, label: dictionary.commissionNav },
    { href: `/${locale}/queue`, label: dictionary.queue },
    { href: `/${locale}/documents`, label: dictionary.documents },
    { href: `/${locale}/about`, label: dictionary.about },
  ];
  const activeHref = links
    .filter(({ href }) => pathname === href || (href !== `/${locale}` && pathname.startsWith(`${href}/`)))
    .sort((left, right) => right.href.length - left.href.length)[0]?.href ?? `/${locale}`;

  useEffect(() => {
    authOpenRef.current = authOpen;
  }, [authOpen]);

  useEffect(() => {
    if (!open) {
      return;
    }

    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = () => Array.from(panel?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
    const onKeyDown = (event: KeyboardEvent) => {
      if (authOpenRef.current) return;
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
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      openerRef.current?.focus();
    };
  }, [onClose, open]);

  return (
    <div aria-hidden={!open} className={styles.sidebarLayer} hidden={!open}>
      <button aria-label="Close menu backdrop" className={styles.sidebarBackdrop} onClick={onClose} type="button" />
      <aside aria-hidden={authOpen || undefined} aria-label="Site navigation" className={styles.sidebar} inert={authOpen || undefined} ref={panelRef}>
        <IconButton aria-label={dictionary.closeMenu} className={styles.iconButton} onClick={onClose}>
          ×
        </IconButton>
        <nav className={styles.sidebarNav}>
          {links.map(({ href, label }) => <Link aria-current={href === activeHref ? "page" : undefined} href={href} key={href} onClick={onClose}>{label}</Link>)}
        </nav>
        <button className={styles.sidebarLogin} onClick={(event) => show(event.currentTarget)} type="button">
          {dictionary.login}
        </button>
      </aside>
    </div>
  );
}

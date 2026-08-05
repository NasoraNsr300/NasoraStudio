"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";

import type { Locale } from "@/shared/i18n/locales";
import type { PortfolioItem } from "@/shared/types/public-content";

import styles from "./portfolio.module.css";

export type ImageLightboxProps = {
  item: PortfolioItem | null;
  locale: Locale;
  onClose(): void;
};

const closeCopy: Record<Locale, string> = { en: "Close artwork", th: "ปิดภาพผลงาน" };

export function ImageLightbox({ item, locale, onClose }: ImageLightboxProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const close = useCallback(() => {
    onClose();
    openerRef.current?.focus();
  }, [onClose]);

  useEffect(() => {
    if (!item) return;

    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])',
      ) ?? []);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialogRef.current?.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      openerRef.current?.focus();
    };
  }, [item, close]);

  if (!item) return null;

  return (
    <div
      aria-label={item.title[locale]}
      aria-modal="true"
      className={styles.lightboxBackdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      ref={dialogRef}
      role="dialog"
    >
      <figure className={styles.lightboxFigure}>
        <button
          aria-label={closeCopy[locale]}
          className={styles.closeButton}
          onClick={close}
          ref={closeButtonRef}
          type="button"
        >
          ×
        </button>
        {item.media.kind === "video" ? (
          <video
            className={styles.lightboxVideo}
            controls
            poster={item.media.posterSrc ?? item.media.cardSrc}
            preload="none"
            src={item.media.detailSrc}
          />
        ) : (
          <Image
            alt={item.media.alt[locale]}
            className={styles.lightboxImage}
            height={item.media.height}
            src={item.media.detailSrc}
            width={item.media.width}
          />
        )}
        <figcaption>{item.title[locale]}</figcaption>
      </figure>
    </div>
  );
}

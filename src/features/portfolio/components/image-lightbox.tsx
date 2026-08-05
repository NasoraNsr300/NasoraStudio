"use client";

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";

import type { PortfolioItem } from "@/shared/types/public-content";

import styles from "./portfolio.module.css";

export type ImageLightboxProps = {
  item: PortfolioItem | null;
  onClose(): void;
};

export function ImageLightbox({ item, onClose }: ImageLightboxProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
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
      if (event.key === "Escape") close();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      openerRef.current?.focus();
    };
  }, [item, close]);

  if (!item) return null;

  const source = item.media.kind === "image" ? item.media.detailSrc : (item.media.posterSrc ?? item.media.cardSrc);

  return (
    <div
      aria-label={item.title.en}
      aria-modal="true"
      className={styles.lightboxBackdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      role="dialog"
    >
      <figure className={styles.lightboxFigure}>
        <button
          aria-label="Close artwork"
          className={styles.closeButton}
          onClick={close}
          ref={closeButtonRef}
          type="button"
        >
          ×
        </button>
        <Image
          alt={item.media.alt.en}
          className={styles.lightboxImage}
          height={item.media.height}
          src={source}
          width={item.media.width}
        />
        <figcaption>{item.title.en}</figcaption>
      </figure>
    </div>
  );
}

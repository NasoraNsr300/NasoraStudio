"use client";

import type { Locale } from "@/shared/i18n/locales";
import { getDictionary } from "@/shared/i18n/dictionaries";
import { IconButton } from "@/shared/components/primitives/icon-button";

import { AuthPreviewPanel, useAuthPreview } from "./auth-preview";
import styles from "./public-shell.module.css";

export function AccountButton({ locale }: { locale: Locale }) {
  const { open, toggle } = useAuthPreview();
  const dictionary = getDictionary(locale);

  return (
    <div className={styles.accountControl}>
      <IconButton
        aria-expanded={open}
        aria-label={dictionary.account}
        className={styles.accountButton}
        onClick={(event) => toggle(event.currentTarget)}
      >
        ◉
      </IconButton>
      {open ? <AuthPreviewPanel locale={locale} /> : null}
    </div>
  );
}

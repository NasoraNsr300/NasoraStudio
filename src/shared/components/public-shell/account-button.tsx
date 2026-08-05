"use client";

import { useState } from "react";

import type { Locale } from "@/shared/i18n/locales";
import { getDictionary } from "@/shared/i18n/dictionaries";
import { IconButton } from "@/shared/components/primitives/icon-button";

import styles from "./public-shell.module.css";

export function AccountButton({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const dictionary = getDictionary(locale);

  return (
    <div className={styles.accountControl}>
      <IconButton
        aria-expanded={open}
        aria-label={dictionary.account}
        className={styles.accountButton}
        onClick={() => setOpen((value) => !value)}
      >
        ◉
      </IconButton>
      {open ? (
        <section aria-label="Authentication preview" className={styles.accountPanel}>
          <strong>Authentication preview</strong>
          <p>Sign-in will be connected in Stage 2.</p>
          <button onClick={() => setOpen(false)} type="button">Close preview</button>
        </section>
      ) : null}
    </div>
  );
}

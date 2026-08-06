"use client";

import { UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { Locale } from "@/shared/i18n/locales";
import { getDictionary } from "@/shared/i18n/dictionaries";
import { IconButton } from "@/shared/components/primitives/icon-button";
import { useAuthDialog } from "@/shared/auth/auth-dialog-controller";
import { useAuthSession } from "@/shared/auth/auth-session-provider";

import { AccountMenu, NotificationPanel } from "./account-menu";
import styles from "./public-shell.module.css";

export function AccountButton({ locale }: { locale: Locale }) {
  const [panel, setPanel] = useState<"menu" | "notifications" | null>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const { open: authOpen, show } = useAuthDialog();
  const { signOut, status, user } = useAuthSession();
  const dictionary = getDictionary(locale);

  useEffect(() => {
    if (!panel) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!controlRef.current?.contains(event.target as Node)) setPanel(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [panel]);

  return (
    <div className={styles.accountControl} ref={controlRef}>
      <IconButton
        aria-expanded={authOpen || panel !== null}
        aria-label={dictionary.account}
        className={styles.accountButton}
        onClick={(event) => {
          if (status !== "signedIn") show(event.currentTarget);
          else setPanel((current) => current ? null : "menu");
        }}
      >
        <UserRound size={22} />
      </IconButton>
      {status === "signedIn" && panel === "menu" ? <AccountMenu locale={locale} nickname={user?.nickname ?? "Member"} onClose={() => setPanel(null)} onShowNotifications={() => setPanel("notifications")} onSignOut={async () => { await signOut(); setPanel(null); }} /> : null}
      {status === "signedIn" && panel === "notifications" ? <NotificationPanel locale={locale} onBack={() => setPanel("menu")} /> : null}
    </div>
  );
}

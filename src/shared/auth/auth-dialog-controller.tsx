"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { Locale } from "@/shared/i18n/locales";
import { safeMemberReturnTarget } from "./return-target";

import { AuthDialog } from "./auth-dialog";

type AuthDialogState = {
  close(): void;
  open: boolean;
  returnTarget: string | null;
  show(opener?: HTMLElement | null, returnTarget?: string | null): void;
};

const AuthDialogContext = createContext<AuthDialogState | null>(null);

export function AuthDialogProvider({ children, locale }: { children: ReactNode; locale: Locale }) {
  const [open, setOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState<string | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const close = useCallback(() => setOpen(false), []);
  const show = useCallback((opener?: HTMLElement | null, target?: string | null) => {
    openerRef.current = opener ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setReturnTarget(target ?? null);
    setOpen(true);
  }, []);
  const value = useMemo(() => ({ close, open, returnTarget, show }), [close, open, returnTarget, show]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") !== "1") return;

    const timeout = window.setTimeout(
      () => show(null, safeMemberReturnTarget(params.get("next"), locale)),
      0,
    );
    return () => window.clearTimeout(timeout);
  }, [locale, show]);

  useEffect(() => {
    if (!open && wasOpenRef.current) openerRef.current?.focus();
    wasOpenRef.current = open;
  }, [open]);

  return <AuthDialogContext.Provider value={value}>{children}</AuthDialogContext.Provider>;
}

export function useAuthDialog() {
  const context = useContext(AuthDialogContext);
  if (!context) throw new Error("useAuthDialog must be used within AuthDialogProvider");
  return context;
}

export function AuthDialogHost({ locale }: { locale: Locale }) {
  const { close, open, returnTarget } = useAuthDialog();
  return open ? <AuthDialog locale={locale} onAuthenticated={() => {
    if (returnTarget) window.location.assign(returnTarget);
    else close();
  }} onClose={close} /> : null;
}

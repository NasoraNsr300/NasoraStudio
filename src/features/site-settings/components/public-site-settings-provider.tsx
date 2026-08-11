"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { PublicSiteSettings } from "@/features/site-settings/domain/site-settings";

const PublicSiteSettingsContext = createContext<PublicSiteSettings | null>(null);

export function PublicSiteSettingsProvider({
  children,
  settings,
}: {
  children: ReactNode;
  settings: PublicSiteSettings | null;
}) {
  return <PublicSiteSettingsContext.Provider value={settings}>{children}</PublicSiteSettingsContext.Provider>;
}

export function useOptionalPublicSiteSettings() {
  return useContext(PublicSiteSettingsContext);
}

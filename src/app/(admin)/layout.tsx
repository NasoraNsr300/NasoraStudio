import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { notoSansThai, sora } from "../fonts";
import "../globals.css";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { isNasoraAdmin } from "@/shared/auth/admin-access";
import { createClient } from "@/shared/supabase/server";
import { ThemeScript } from "@/shared/theme/theme-script";
import { getPublicSiteSettings } from "@/features/site-settings/data/public-site-settings-repository.server";

export const metadata: Metadata = { title: "Nasora Admin" };

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !isNasoraAdmin(data.user)) redirect("/th?auth=1");
  const settings = await getPublicSiteSettings();

  return <html className={`${sora.variable} ${notoSansThai.variable}`} lang="th" suppressHydrationWarning><head><ThemeScript /></head><body><AdminShell initialCommissionsOpen={settings.commissionsOpen}>{children}</AdminShell></body></html>;
}

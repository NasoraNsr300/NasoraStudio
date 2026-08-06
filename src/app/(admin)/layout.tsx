import type { Metadata } from "next";
import type { ReactNode } from "react";

import { notoSansThai, sora } from "../fonts";
import "../globals.css";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { ThemeScript } from "@/shared/theme/theme-script";

export const metadata: Metadata = { title: "Nasora Admin" };

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html className={`${sora.variable} ${notoSansThai.variable}`} lang="th" suppressHydrationWarning><head><ThemeScript /></head><body><AdminShell>{children}</AdminShell></body></html>;
}

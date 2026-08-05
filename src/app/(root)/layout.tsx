import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ThemeScript } from "@/shared/theme/theme-script";

import { notoSansThai, sora } from "../fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: "Nasora",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html className={`${sora.variable} ${notoSansThai.variable}`} lang="th" suppressHydrationWarning>
      <head><ThemeScript /></head>
      <body>{children}</body>
    </html>
  );
}

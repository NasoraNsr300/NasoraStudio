import type { Metadata } from "next";
import type { ReactNode } from "react";

import { notoSansThai, sora } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nasora",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html className={`${sora.variable} ${notoSansThai.variable}`} lang="th">
      <body>{children}</body>
    </html>
  );
}

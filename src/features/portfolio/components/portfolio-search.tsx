"use client";

import { useSearchParams } from "next/navigation";

import type { Locale } from "@/shared/i18n/locales";
import type { PortfolioItem } from "@/shared/types/public-content";

import { PortfolioPage } from "./portfolio-page";

export type PortfolioSearchProps = {
  items: PortfolioItem[];
  locale: Locale;
};

export function PortfolioSearch({ items, locale }: PortfolioSearchProps) {
  const searchParams = useSearchParams();

  return (
    <PortfolioPage
      initialCategory={searchParams.get("category")}
      initialQuery={searchParams.get("q")}
      initialWork={searchParams.get("work")}
      items={items}
      locale={locale}
    />
  );
}

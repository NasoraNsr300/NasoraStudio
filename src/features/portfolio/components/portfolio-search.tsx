"use client";

import { useSearchParams } from "next/navigation";

import type { Locale } from "@/shared/i18n/locales";
import type { PublicPortfolioItem } from "@/features/portfolio/domain/portfolio";

import { PortfolioPage } from "./portfolio-page";

export type PortfolioSearchProps = {
  items: PublicPortfolioItem[];
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

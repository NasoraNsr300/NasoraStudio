"use client";

import type { Locale } from "@/shared/i18n/locales";
import type { FeaturedItem, HeroItem } from "@/shared/types/public-content";
import type { PublicSiteSettings } from "@/features/site-settings/domain/site-settings";

import { FeaturedCarousel } from "./featured-carousel";
import { HomeHero } from "./home-hero";
import styles from "./home.module.css";
import { QuickInfoPanel } from "./quick-info-panel";

export type HomePageProps = {
  heroItems: HeroItem[];
  featuredItems: FeaturedItem[];
  locale: Locale;
  randomValue?: number;
  settings?: PublicSiteSettings;
};

export function HomePage({ heroItems, featuredItems, locale, randomValue, settings }: HomePageProps) {
  return (
    <main className={styles.home} data-home-shell="true">
      <HomeHero heroItems={heroItems} locale={locale} randomValue={randomValue} settings={settings} />
      <div className={styles.lowerGrid} data-home-lower-grid="true">
        <FeaturedCarousel items={featuredItems} locale={locale} />
        <QuickInfoPanel locale={locale} settings={settings} />
      </div>
    </main>
  );
}

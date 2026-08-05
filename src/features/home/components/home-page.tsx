"use client";

import type { Locale } from "@/shared/i18n/locales";
import type { FeaturedItem, HeroItem } from "@/shared/types/public-content";

import { FeaturedCarousel } from "./featured-carousel";
import { HomeHero } from "./home-hero";
import styles from "./home.module.css";
import { QuickInfoPanel } from "./quick-info-panel";

export type HomePageProps = {
  heroItems: HeroItem[];
  featuredItems: FeaturedItem[];
  locale: Locale;
  randomValue: number;
};

export function HomePage({ heroItems, featuredItems, locale, randomValue }: HomePageProps) {
  return (
    <main className={styles.home}>
      <HomeHero heroItems={heroItems} locale={locale} randomValue={randomValue} />
      <div className={styles.lowerGrid}>
        <FeaturedCarousel items={featuredItems} locale={locale} />
        <QuickInfoPanel locale={locale} />
      </div>
    </main>
  );
}

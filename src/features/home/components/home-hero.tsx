"use client";

import type { CSSProperties } from "react";
import { useState } from "react";

import { selectHero } from "@/features/home/lib/select-hero";
import type { Locale } from "@/shared/i18n/locales";
import type { HeroItem } from "@/shared/types/public-content";

import styles from "./home.module.css";

export type HomeHeroProps = {
  heroItems: HeroItem[];
  locale: Locale;
  randomValue: number;
};

export function HomeHero({ heroItems, locale, randomValue }: HomeHeroProps) {
  // The server-generated value is serialized with this client boundary, so this
  // lazy selection is identical during hydration and stays fixed for the visit.
  const [hero] = useState(() => selectHero(heroItems, randomValue));
  const mediaStyle = {
    "--hero-aspect-ratio": hero.crop.aspectRatio,
    objectPosition: hero.crop.objectPosition,
  } as CSSProperties;

  return (
    <section aria-labelledby="home-hero-title" className={styles.hero}>
      <link as="image" href={hero.media.cardSrc} rel="preload" />
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>NASORA STUDIO</p>
        <h1 id="home-hero-title">{hero.title[locale]}</h1>
        <p className={styles.heroDescription}>{hero.description[locale]}</p>
        <p className={styles.heroServices}>Commission · Illustration · Minecraft</p>
        <div className={styles.heroActions}>
          <a className={styles.primaryAction} href={`/${locale}/commission`}>View commissions</a>
          <a className={styles.secondaryAction} href="#featured-work">Explore featured work</a>
        </div>
      </div>
      <div className={styles.heroArtwork} style={mediaStyle}>
        {/* Public derivatives reserve the same 16:9 placement before the image loads. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={hero.media.alt[locale]}
          className={styles.heroImage}
          fetchPriority="high"
          height={hero.media.height}
          sizes="(min-width: 900px) 52vw, 100vw"
          src={hero.media.cardSrc}
          srcSet={`${hero.media.thumbnailSrc} 480w, ${hero.media.cardSrc} 960w, ${hero.media.detailSrc} 1600w`}
          width={hero.media.width}
        />
      </div>
    </section>
  );
}

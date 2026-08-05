"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

import { selectHero } from "@/features/home/lib/select-hero";
import type { Locale } from "@/shared/i18n/locales";
import type { HeroItem } from "@/shared/types/public-content";

import styles from "./home.module.css";

export type HomeHeroProps = {
  heroItems: HeroItem[];
  locale: Locale;
  /** Injected by component tests; production selection uses browser Web Crypto. */
  randomValue?: number;
};

const HERO_IMAGE_SIZES = "(min-width: 900px) 52vw, 100vw";

function getResponsiveSourceSet(hero: HeroItem) {
  return `${hero.media.thumbnailSrc} 480w, ${hero.media.cardSrc} 960w, ${hero.media.detailSrc} 1600w`;
}

function getClientRandomValue() {
  const value = new Uint32Array(1);
  window.crypto.getRandomValues(value);
  return value[0] / 2 ** 32;
}

export function HomeHero({ heroItems, locale, randomValue }: HomeHeroProps) {
  // This deterministic first item is emitted during static rendering. The
  // one-time client effect replaces it after mount without changing the frame.
  const [fallbackHero] = useState(() => heroItems[0]);
  const [hero, setHero] = useState(() => fallbackHero);
  const initialHeroItems = useRef(heroItems);
  const initialRandomValue = useRef(randomValue);

  useEffect(() => {
    const selectedHero = selectHero(
      initialHeroItems.current,
      initialRandomValue.current ?? getClientRandomValue(),
    );
    setHero(selectedHero);
  }, []);

  if (!fallbackHero || !hero) {
    throw new Error("HomeHero requires at least one Hero item");
  }

  const mediaStyle = {
    "--hero-aspect-ratio": fallbackHero.crop.aspectRatio,
    objectPosition: hero.crop.objectPosition,
  } as CSSProperties;

  return (
    <section aria-labelledby="home-hero-title" className={styles.hero}>
      <link
        as="image"
        href={hero.media.cardSrc}
        imageSizes={HERO_IMAGE_SIZES}
        imageSrcSet={getResponsiveSourceSet(hero)}
        rel="preload"
      />
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
          sizes={HERO_IMAGE_SIZES}
          src={hero.media.cardSrc}
          srcSet={getResponsiveSourceSet(hero)}
          width={hero.media.width}
        />
      </div>
    </section>
  );
}

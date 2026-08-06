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

const copy = {
  en: {
    commission: "View commissions",
    explore: "Explore featured work",
    headlineAccent: "Studio",
    headlineLead: "Visual Designer &",
    headlineSub: "Illustrator",
    services: "Commission · Illustration · Minecraft",
    studio: "NASORA STUDIO",
  },
  th: {
    commission: "ดูบริการคอมมิชชัน",
    explore: "สำรวจผลงานแนะนำ",
    headlineAccent: "Studio",
    headlineLead: "Visual Designer &",
    headlineSub: "Illustrator",
    services: "คอมมิชชัน · ภาพประกอบ · Minecraft",
    studio: "NASORA STUDIO",
  },
} as const;

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
  const [mediaHero, setMediaHero] = useState(() => fallbackHero);
  const initialHeroItems = useRef(heroItems);
  const initialRandomValue = useRef(randomValue);

  useEffect(() => {
    const selectedHero = selectHero(
      initialHeroItems.current,
      initialRandomValue.current ?? getClientRandomValue(),
    );
    setMediaHero(selectedHero);
  }, []);

  if (!fallbackHero || !mediaHero) {
    throw new Error("HomeHero requires at least one Hero item");
  }

  const mediaStyle = {
    "--hero-aspect-ratio": fallbackHero.crop.aspectRatio,
    objectPosition: mediaHero.crop.objectPosition,
  } as CSSProperties;
  const labels = copy[locale];

  return (
    <section aria-labelledby="home-hero-title" className={styles.hero} data-home-hero="true">
      <link
        as="image"
        href={fallbackHero.media.cardSrc}
        imageSizes={HERO_IMAGE_SIZES}
        imageSrcSet={getResponsiveSourceSet(fallbackHero)}
        rel="preload"
      />
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>{labels.studio}</p>
        <h1 id="home-hero-title">
          <span className={styles.heroLine}>{labels.headlineLead}</span>
          <span className={styles.heroLine}>
            {labels.headlineSub}{" "}
            <span className={styles.heroAccent}>{labels.headlineAccent}</span>
          </span>
        </h1>
        <p className={styles.heroServices}>{labels.services}</p>
        <p className={styles.heroDescription}>{fallbackHero.description[locale]}</p>
        <div className={styles.heroActions}>
          <a className={styles.primaryAction} href={`/${locale}/commission`}>{labels.commission}</a>
          <a className={styles.secondaryAction} href="#featured-work">{labels.explore}</a>
        </div>
      </div>
      <div className={styles.heroArtwork} style={mediaStyle}>
        {/* Public derivatives reserve the same 16:9 placement before the image loads. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={mediaHero.media.alt[locale]}
          className={styles.heroImage}
          fetchPriority="high"
          height={mediaHero.media.height}
          sizes={HERO_IMAGE_SIZES}
          src={mediaHero.media.cardSrc}
          srcSet={getResponsiveSourceSet(mediaHero)}
          width={mediaHero.media.width}
        />
      </div>
    </section>
  );
}

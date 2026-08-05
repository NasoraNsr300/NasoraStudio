import type { CSSProperties } from "react";

import type { Locale } from "@/shared/i18n/locales";
import type { PublicMedia } from "@/shared/types/public-content";

import styles from "./media-frame.module.css";

type ResponsiveMediaProps = {
  media: PublicMedia;
  locale: Locale;
  sizes: string;
  priority?: boolean;
  className?: string;
  aspectRatio?: string;
};

export function ResponsiveMedia({
  media,
  locale,
  sizes,
  priority = false,
  className,
  aspectRatio = `${media.width} / ${media.height}`,
}: ResponsiveMediaProps) {
  const frameStyle = { "--media-aspect-ratio": aspectRatio } as CSSProperties;

  if (media.kind === "video") {
    return (
      <div className={`${styles.frame} ${className ?? ""}`.trim()} style={frameStyle}>
        <video
          aria-label={media.alt[locale]}
          className={styles.media}
          controls
          poster={media.posterSrc ?? media.cardSrc}
          preload="none"
        >
          <source src={media.detailSrc} />
        </video>
      </div>
    );
  }

  return (
    <div className={`${styles.frame} ${className ?? ""}`.trim()} style={frameStyle}>
      {/* Public derivatives already have explicit responsive variants; Next image optimization is not used. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={media.alt[locale]}
        className={styles.media}
        height={media.height}
        loading={priority ? "eager" : "lazy"}
        sizes={sizes}
        src={media.cardSrc}
        srcSet={`${media.thumbnailSrc} 480w, ${media.cardSrc} 960w, ${media.detailSrc} 1600w`}
        width={media.width}
      />
    </div>
  );
}

import type { CSSProperties } from "react";

import type { Locale } from "@/shared/i18n/locales";
import type { MediaCrop, PublicMedia } from "@/shared/types/public-content";

import styles from "./media-frame.module.css";

type ResponsiveMediaProps = {
  media: PublicMedia;
  locale: Locale;
  sizes: string;
  priority?: boolean;
  className?: string;
  aspectRatio?: string;
  crop?: MediaCrop;
};

export function ResponsiveMedia({
  media,
  locale,
  sizes,
  priority = false,
  className,
  aspectRatio,
  crop,
}: ResponsiveMediaProps) {
  const frameStyle = {
    "--media-aspect-ratio": crop?.aspectRatio ?? aspectRatio ?? `${media.width} / ${media.height}`,
  } as CSSProperties;
  const mediaStyle = { objectPosition: crop?.objectPosition ?? "50% 50%" };

  if (media.kind === "video") {
    return (
      <div className={`${styles.frame} ${className ?? ""}`.trim()} style={frameStyle}>
        <video
          aria-label={media.alt[locale]}
          className={styles.media}
          controls
          poster={media.posterSrc ?? media.cardSrc}
          preload="none"
          style={mediaStyle}
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
        style={mediaStyle}
        width={media.width}
      />
    </div>
  );
}

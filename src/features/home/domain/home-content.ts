import type { PublicPortfolioItem } from "@/features/portfolio/domain/portfolio";
import type { PublicSiteSettings } from "@/features/site-settings/domain/site-settings";
import type { FeaturedItem, HeroItem, PublicMedia } from "@/shared/types/public-content";

function homeMedia(item: PublicPortfolioItem): PublicMedia {
  return {
    alt: item.media.alt,
    cardSrc: item.media.cardSrc,
    detailSrc: item.media.detailSrc,
    height: item.media.height,
    id: item.media.id,
    kind: "image",
    thumbnailSrc: item.media.cardSrc,
    width: item.media.width,
  };
}

function aspectRatio(item: PublicPortfolioItem) {
  return `${item.media.width} / ${item.media.height}`;
}

export function mapPortfolioHero(item: PublicPortfolioItem, settings: PublicSiteSettings): HeroItem {
  return {
    crop: { aspectRatio: aspectRatio(item), objectPosition: "50% 50%" },
    description: settings.homeDescription,
    enabled: item.showInHero,
    id: item.id,
    media: homeMedia(item),
    selectionWeight: 1,
    title: settings.homeHeading,
  };
}

export function mapPortfolioFeatured(item: PublicPortfolioItem): FeaturedItem {
  return {
    crop: { aspectRatio: aspectRatio(item), objectPosition: "50% 50%" },
    description: item.title,
    destination: `/portfolio?work=${encodeURIComponent(item.id)}`,
    displayOrder: item.displayOrder,
    id: item.id,
    media: homeMedia(item),
    title: item.title,
  };
}

import type { Locale } from "@/shared/i18n/locales";

export type LocalizedText = Record<Locale, string>;

export type PublicMedia = {
  id: string;
  kind: "image" | "video";
  alt: Record<"th" | "en", string>;
  thumbnailSrc: string;
  cardSrc: string;
  detailSrc: string;
  width: number;
  height: number;
  posterSrc?: string;
};

export type MediaCrop = {
  aspectRatio: string;
  objectPosition: string;
};

export type HeroItem = {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  media: PublicMedia;
  crop: MediaCrop;
  enabled: boolean;
  selectionWeight: number;
};

export type FeaturedItem = {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  media: PublicMedia;
  crop: MediaCrop;
  displayOrder: number;
  destination: string;
};

export type PortfolioItem = {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  category: string;
  media: PublicMedia;
  crop: MediaCrop & { gridSpan: "standard" | "wide" | "tall" };
  displayOrder: number;
  featured: boolean;
};

export type ServiceAvailability = "open" | "limited" | "closed";

export type ServiceCategory = {
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  coverMedia: PublicMedia;
  coverCrop: MediaCrop;
  displayOrder: number;
  availability: ServiceAvailability;
  recommended: boolean;
  typeCount: number;
  published: boolean;
};

export type ServicePrice = {
  label: LocalizedText;
  usage: "personal" | "commercial";
  amountThb: number;
};

export type ServiceModifier = {
  label: LocalizedText;
  kind: "fixed" | "percentage";
  value: number;
};

export type CommissionExample = {
  id: string;
  title: LocalizedText;
  media: PublicMedia;
  crop: MediaCrop;
};

export type ServiceType = {
  slug: string;
  categorySlug: string;
  name: LocalizedText;
  description: LocalizedText;
  availability: ServiceAvailability;
  displayOrder: number;
  timingGuidance: LocalizedText;
  referencePrices: ServicePrice[];
  modifiers: ServiceModifier[];
  documentSlugs: string[];
  examples: CommissionExample[];
  published: boolean;
};

/**
 * Public queue projection only. `never` guards prevent known private record
 * categories from being assigned through a structurally wider variable.
 */
export type PublicQueueItem = {
  position: number;
  displayName: string;
  serviceName: string;
  statusLabel: string;
  deadlineLabel: string;
} & {
  quoteId?: never;
  quote?: never;
  paymentId?: never;
  payment?: never;
  messageId?: never;
  messages?: never;
  contact?: never;
  contactDetails?: never;
  deliveryId?: never;
  deliveryUrl?: never;
  delivery?: never;
};

export type DocumentSummary = {
  slug: string;
  category: string;
  title: LocalizedText;
  summary: LocalizedText;
  content: LocalizedText;
  tags: LocalizedText[];
  pinned: boolean;
  displayOrder: number;
  published: boolean;
  coverMedia?: PublicMedia;
};

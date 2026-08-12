import { z } from "zod";

import type {
  PublicMedia,
  ServiceCategory,
  ServiceModifier,
  ServiceType,
} from "@/shared/types/public-content";

export const localizedTextSchema = z.object({
  en: z.string(),
  th: z.string(),
}).strict();

const availabilitySchema = z.enum(["open", "limited", "closed"]);
const satangSchema = z.union([z.number().int().nonnegative().max(2_147_483_647), z.string().regex(/^\d+$/)]).transform((value, context) => {
  const amount = typeof value === "string" ? Number(value) : value;
  if (!Number.isSafeInteger(amount) || amount > 2_147_483_647) {
    context.addIssue({ code: "custom", message: "Invalid satang amount" });
    return z.NEVER;
  }
  return amount;
});

const mediaRowSchema = z.object({
  alt: localizedTextSchema,
  content_type: z.enum(["image/png", "image/jpeg", "image/webp"]),
  height: z.number().int().positive(),
  id: z.uuid(),
  width: z.number().int().positive(),
}).strict();

const priceRowSchema = z.object({
  amount_satang: satangSchema,
  display_order: z.number().int().nonnegative(),
  label: localizedTextSchema,
  pace: z.enum(["normal", "rush"]),
  service_id: z.uuid(),
  usage: z.enum(["personal", "commercial"]),
}).strict();

const modifierSchema = z.object({
  kind: z.enum(["fixed", "percentage"]),
  label: localizedTextSchema,
  value: z.number(),
}).strict();

export const catalogServiceRowSchema = z.object({
  album_id: z.uuid(),
  archived_at: z.string().datetime().nullable(),
  availability: availabilitySchema,
  commission_catalog_media: mediaRowSchema.nullable(),
  commission_service_prices: z.array(priceRowSchema),
  description: localizedTextSchema,
  display_order: z.number().int().nonnegative(),
  document_slugs: z.array(z.string()),
  free_revision_count: z.number().int().nonnegative(),
  id: z.uuid(),
  modifiers: z.array(modifierSchema),
  name: localizedTextSchema,
  published: z.boolean(),
  slug: z.string().min(1),
  timing_guidance: localizedTextSchema,
}).strict();

export const catalogAlbumRowSchema = z.object({
  archived_at: z.string().datetime().nullable(),
  availability: availabilitySchema,
  commission_catalog_media: mediaRowSchema.nullable(),
  commission_services: z.array(catalogServiceRowSchema),
  description: localizedTextSchema,
  display_order: z.number().int().nonnegative(),
  id: z.uuid(),
  name: localizedTextSchema,
  published: z.boolean(),
  recommended: z.boolean(),
  slug: z.string().min(1),
}).strict();

export type CatalogAlbumRow = z.infer<typeof catalogAlbumRowSchema>;
export type CatalogServiceRow = z.infer<typeof catalogServiceRowSchema>;
export type LocalizedText = z.infer<typeof localizedTextSchema>;

export type AdminCatalogPrice = {
  amountSatang: number;
  displayOrder: number;
  label: LocalizedText;
  pace: "normal" | "rush";
  usage: "personal" | "commercial";
};

export type AdminCatalogService = {
  albumId: string;
  archivedAt: string | null;
  availability: "open" | "limited" | "closed";
  coverMedia: PublicMedia | undefined;
  description: LocalizedText;
  displayOrder: number;
  documentSlugs: string[];
  freeRevisionCount: number;
  id: string;
  modifiers: ServiceModifier[];
  name: LocalizedText;
  prices: AdminCatalogPrice[];
  published: boolean;
  slug: string;
  timingGuidance: LocalizedText;
};

export type AdminCatalogAlbum = {
  archivedAt: string | null;
  availability: "open" | "limited" | "closed";
  coverMedia: PublicMedia | undefined;
  description: LocalizedText;
  displayOrder: number;
  id: string;
  name: LocalizedText;
  published: boolean;
  recommended: boolean;
  serviceCount: number;
  services: AdminCatalogService[];
  slug: string;
};

function mapMedia(row: z.infer<typeof mediaRowSchema> | null): PublicMedia | undefined {
  if (!row) return undefined;
  const src = `/api/catalog/media/${row.id}`;
  return {
    alt: row.alt,
    cardSrc: src,
    detailSrc: src,
    height: row.height,
    id: row.id,
    kind: "image",
    thumbnailSrc: src,
    width: row.width,
  };
}

export function mapAdminService(row: CatalogServiceRow): AdminCatalogService {
  return {
    albumId: row.album_id,
    archivedAt: row.archived_at,
    availability: row.availability,
    coverMedia: mapMedia(row.commission_catalog_media),
    description: row.description,
    displayOrder: row.display_order,
    documentSlugs: row.document_slugs,
    freeRevisionCount: row.free_revision_count,
    id: row.id,
    modifiers: row.modifiers,
    name: row.name,
    prices: row.commission_service_prices
      .map((price) => ({ amountSatang: price.amount_satang, displayOrder: price.display_order, label: price.label, pace: price.pace, usage: price.usage }))
      .sort((left, right) => left.displayOrder - right.displayOrder),
    published: row.published,
    slug: row.slug,
    timingGuidance: row.timing_guidance,
  };
}

export function mapAdminAlbum(row: CatalogAlbumRow): AdminCatalogAlbum {
  const services = row.commission_services.map(mapAdminService).sort((left, right) => left.displayOrder - right.displayOrder);
  return {
    archivedAt: row.archived_at,
    availability: row.availability,
    coverMedia: mapMedia(row.commission_catalog_media),
    description: row.description,
    displayOrder: row.display_order,
    id: row.id,
    name: row.name,
    published: row.published,
    recommended: row.recommended,
    serviceCount: services.filter((service) => !service.archivedAt).length,
    services,
    slug: row.slug,
  };
}

export function mapPublicAlbum(row: CatalogAlbumRow): { category: ServiceCategory; types: ServiceType[] } {
  const activeServices = row.commission_services
    .filter((service) => service.published && !service.archived_at && service.commission_service_prices.length > 0)
    .sort((left, right) => left.display_order - right.display_order);
  const category: ServiceCategory = {
    availability: row.availability,
    coverCrop: row.commission_catalog_media ? { aspectRatio: "4 / 5", objectPosition: "50% 50%" } : undefined,
    coverMedia: mapMedia(row.commission_catalog_media),
    description: row.description,
    displayOrder: row.display_order,
    name: row.name,
    published: row.published,
    recommended: row.recommended,
    slug: row.slug,
    typeCount: activeServices.length,
  };
  const types: ServiceType[] = activeServices.map((service) => {
    const coverMedia = mapMedia(service.commission_catalog_media);
    return {
      availability: service.availability,
      categorySlug: row.slug,
      description: service.description,
      displayOrder: service.display_order,
      documentSlugs: service.document_slugs,
      examples: coverMedia ? [{
        crop: { aspectRatio: "1 / 1", objectPosition: "50% 50%" },
        id: coverMedia.id,
        media: coverMedia,
        title: service.name,
      }] : [],
      freeRevisionCount: service.free_revision_count,
      modifiers: service.modifiers,
      name: service.name,
      published: service.published,
      referencePrices: service.commission_service_prices
        .map((price) => ({ amountThb: price.amount_satang / 100, label: price.label, pace: price.pace, usage: price.usage }))
        .sort((left, right) => {
          const leftRow = service.commission_service_prices.find((price) => price.usage === left.usage && price.pace === left.pace);
          const rightRow = service.commission_service_prices.find((price) => price.usage === right.usage && price.pace === right.pace);
          return (leftRow?.display_order ?? 0) - (rightRow?.display_order ?? 0);
        }),
      slug: service.slug,
      timingGuidance: service.timing_guidance,
    };
  });
  return { category, types };
}

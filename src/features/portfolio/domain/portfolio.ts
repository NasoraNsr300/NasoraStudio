import { z } from "zod";

export type LocalizedPortfolioText = { en: string; th: string };

const localizedTextSchema = z.object({
  en: z.string().trim().min(1).max(200),
  th: z.string().trim().min(1).max(200),
}).strict();

const portfolioMediaRowSchema = z.object({
  alt: z.object({ en: z.string(), th: z.string() }).strict(),
  content_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
  height: z.number().int().positive().max(20_000),
  id: z.uuid(),
  width: z.number().int().positive().max(20_000),
}).strict();

const portfolioAlbumRowSchema = z.object({
  id: z.uuid(),
  name: localizedTextSchema,
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/),
}).strict();

export const portfolioItemRowSchema = z.object({
  archived_at: z.iso.datetime({ offset: true }).nullable(),
  commission_albums: portfolioAlbumRowSchema,
  commission_catalog_media: portfolioMediaRowSchema,
  display_order: z.number().int().nonnegative(),
  featured: z.boolean(),
  id: z.uuid(),
  published: z.boolean(),
  title: localizedTextSchema,
}).strict();

export type PortfolioItemRow = z.infer<typeof portfolioItemRowSchema>;

export type PublicPortfolioItem = {
  category: string;
  categoryName: LocalizedPortfolioText;
  displayOrder: number;
  featured: boolean;
  id: string;
  media: {
    alt: LocalizedPortfolioText;
    cardSrc: string;
    contentType: "image/jpeg" | "image/png" | "image/webp";
    detailSrc: string;
    height: number;
    id: string;
    width: number;
  };
  title: LocalizedPortfolioText;
};

export type AdminPortfolioItem = PublicPortfolioItem & {
  albumId: string;
  archivedAt: string | null;
  mediaId: string;
  published: boolean;
};

export function mapPublicPortfolioItem(row: PortfolioItemRow): PublicPortfolioItem {
  const src = `/api/portfolio/media/${row.commission_catalog_media.id}`;
  return {
    category: row.commission_albums.slug,
    categoryName: row.commission_albums.name,
    displayOrder: row.display_order,
    featured: row.featured,
    id: row.id,
    media: {
      alt: row.commission_catalog_media.alt,
      cardSrc: src,
      contentType: row.commission_catalog_media.content_type,
      detailSrc: src,
      height: row.commission_catalog_media.height,
      id: row.commission_catalog_media.id,
      width: row.commission_catalog_media.width,
    },
    title: row.title,
  };
}
export function mapAdminPortfolioItem(row: PortfolioItemRow): AdminPortfolioItem {
  return {
    ...mapPublicPortfolioItem(row),
    albumId: row.commission_albums.id,
    archivedAt: row.archived_at,
    mediaId: row.commission_catalog_media.id,
    published: row.published,
  };
}

import { z } from "zod";

import { parseSafeRichText, type SafeRichTextDocument } from "@/features/documents/domain/rich-text";
import type { LocalizedText, PublicMedia } from "@/shared/types/public-content";

export type DocumentSummary = {
  slug: string;
  category: string;
  title: LocalizedText;
  summary: LocalizedText;
  content: Record<"en" | "th", SafeRichTextDocument>;
  tags: LocalizedText[];
  pinned: boolean;
  displayOrder: number;
  published: boolean;
  coverMedia?: PublicMedia;
};

export const documentCategories = ["terms", "guide", "privacy"] as const;
export type DocumentCategory = (typeof documentCategories)[number];

const localizedTextSchema = z.object({ en: z.string().max(10_000), th: z.string().max(10_000) }).strict();
const mediaSchema = z.object({
  alt: localizedTextSchema,
  content_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
  height: z.number().int().positive().max(20_000),
  id: z.uuid(),
  width: z.number().int().positive().max(20_000),
}).strict().nullable();

export const publicDocumentRowSchema = z.object({
  archived_at: z.iso.datetime({ offset: true }).nullable(),
  category: z.enum(documentCategories),
  commission_catalog_media: mediaSchema,
  content: z.object({ en: z.unknown(), th: z.unknown() }).strict(),
  display_order: z.number().int().nonnegative(),
  id: z.uuid(),
  pinned: z.boolean(),
  published: z.boolean(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  summary: localizedTextSchema,
  tags: z.array(localizedTextSchema).max(30),
  title: localizedTextSchema,
  updated_at: z.iso.datetime({ offset: true }),
}).strict();

export type PublicDocumentRow = z.infer<typeof publicDocumentRowSchema>;
export type AdminDocument = DocumentSummary & {
  archivedAt: string | null;
  coverMediaId: string | null;
  id: string;
  updatedAt: string;
};

function mapCover(media: NonNullable<PublicDocumentRow["commission_catalog_media"]>): PublicMedia {
  const src = `/api/documents/media/${media.id}`;
  return { alt: media.alt, cardSrc: src, detailSrc: src, height: media.height, id: media.id, kind: "image", thumbnailSrc: src, width: media.width };
}

export function mapPublicDocument(row: PublicDocumentRow): DocumentSummary {
  return {
    category: row.category,
    content: { en: parseSafeRichText(row.content.en), th: parseSafeRichText(row.content.th) },
    coverMedia: row.commission_catalog_media ? mapCover(row.commission_catalog_media) : undefined,
    displayOrder: row.display_order,
    pinned: row.pinned,
    published: row.published,
    slug: row.slug,
    summary: row.summary,
    tags: row.tags,
    title: row.title,
  };
}

export function mapAdminDocument(row: PublicDocumentRow): AdminDocument {
  return { ...mapPublicDocument(row), archivedAt: row.archived_at, coverMediaId: row.commission_catalog_media?.id ?? null, id: row.id, updatedAt: row.updated_at };
}

export type SaveAdminDocumentInput = {
  category: DocumentCategory;
  content: Record<"en" | "th", SafeRichTextDocument>;
  coverMediaId: string | null;
  displayOrder: number;
  id: string | null;
  pinned: boolean;
  published: boolean;
  slug: string;
  summary: LocalizedText;
  tags: LocalizedText[];
  title: LocalizedText;
};

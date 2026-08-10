import { describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/shared/supabase/server", () => supabase);

import { getPublicDocumentCoverObject, listPublicDocuments } from "@/features/documents/data/public-documents-repository.server";
import { createPlainRichText } from "@/features/documents/domain/rich-text";

const documentId = "00000000-0000-4000-8000-000000000701";
const mediaId = "00000000-0000-4000-8000-000000000702";

function row(overrides: Record<string, unknown> = {}) {
  return {
    archived_at: null, category: "guide", commission_catalog_media: { alt: { en: "Cover", th: "ปก" }, content_type: "image/webp", height: 900, id: mediaId, width: 1600 },
    content: { en: createPlainRichText("Clear revision notes"), th: createPlainRichText("แจ้งแก้ไขให้ชัดเจน") }, display_order: 2,
    id: documentId, pinned: true, published: true, slug: "revision-guide", summary: { en: "Guide", th: "คู่มือ" },
    tags: [{ en: "Revision", th: "แก้งาน" }], title: { en: "Revision Guide", th: "คู่มือการแก้งาน" }, updated_at: "2026-08-10T10:00:00.000Z", ...overrides,
  };
}

function queryResult(data: unknown) {
  const query = { eq: vi.fn(() => query), is: vi.fn(() => query), maybeSingle: vi.fn(async () => ({ data: Array.isArray(data) ? data[0] ?? null : data, error: null })), order: vi.fn(async () => ({ data, error: null })), select: vi.fn(() => query) };
  return query;
}

describe("public documents repository", () => {
  it("maps and filters visible bilingual documents without fixtures", async () => {
    const query = queryResult([row(), row({ content: { en: createPlainRichText("Unrelated"), th: createPlainRichText("อื่น") }, id: "00000000-0000-4000-8000-000000000703", pinned: false, slug: "other", tags: [], title: { en: "Other", th: "อื่น" } })]);
    supabase.createClient.mockResolvedValue({ from: vi.fn(() => query) });
    const result = await listPublicDocuments("en", "revision");
    expect(query.eq).toHaveBeenCalledWith("published", true);
    expect(query.is).toHaveBeenCalledWith("archived_at", null);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({ coverMedia: expect.objectContaining({ detailSrc: `/api/documents/media/${mediaId}` }), pinned: true, slug: "revision-guide" }));
  });

  it("fails closed on invalid rich text", async () => {
    supabase.createClient.mockResolvedValue({ from: vi.fn(() => queryResult([row({ content: { en: { type: "html", html: "<script/>" }, th: createPlainRichText("ok") } })])) });
    await expect(listPublicDocuments("en")).rejects.toThrow("Public documents data is unavailable");
  });

  it("returns only document cover keys", async () => {
    supabase.createClient.mockResolvedValueOnce({ from: vi.fn(() => queryResult({ content_type: "image/webp", object_key: `document-covers/${mediaId}.webp` })) });
    await expect(getPublicDocumentCoverObject(mediaId)).resolves.toEqual({ contentType: "image/webp", objectKey: `document-covers/${mediaId}.webp` });
    supabase.createClient.mockResolvedValueOnce({ from: vi.fn(() => queryResult({ content_type: "image/webp", object_key: `portfolio/${mediaId}.webp` })) });
    await expect(getPublicDocumentCoverObject(mediaId)).resolves.toBeNull();
  });
});

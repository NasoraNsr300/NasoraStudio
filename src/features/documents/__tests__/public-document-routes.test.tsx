import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({ getPublicDocument: vi.fn(), listPublicDocuments: vi.fn() }));
const navigation = vi.hoisted(() => ({ notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }) }));
vi.mock("@/features/documents/data/public-documents-repository.server", () => repository);
vi.mock("next/navigation", () => ({ notFound: navigation.notFound, useSearchParams: () => new URLSearchParams() }));

import DocumentsRoute from "@/app/[locale]/documents/page";
import DocumentRoute from "@/app/[locale]/documents/[slug]/page";
import { createPlainRichText } from "@/features/documents/domain/rich-text";

const document = { category: "guide", content: { en: createPlainRichText("Live English body"), th: createPlainRichText("เนื้อหาไทยจริง") }, displayOrder: 1, pinned: true, published: true, slug: "live-guide", summary: { en: "Summary", th: "สรุป" }, tags: [], title: { en: "Live Guide", th: "คู่มือจริง" } };

describe("public document routes", () => {
  it("loads the document center from the live repository", async () => {
    repository.listPublicDocuments.mockResolvedValue([document]);
    render(await DocumentsRoute({ params: Promise.resolve({ locale: "en" }) }));
    expect(repository.listPublicDocuments).toHaveBeenCalledWith("en");
    expect(screen.getByText("Live Guide")).toBeVisible();
  });
  it("loads a dynamic localized reader and fails closed when missing", async () => {
    repository.getPublicDocument.mockResolvedValueOnce(document);
    render(await DocumentRoute({ params: Promise.resolve({ locale: "th", slug: "live-guide" }) }));
    expect(repository.getPublicDocument).toHaveBeenCalledWith("live-guide");
    expect(screen.getByText("เนื้อหาไทยจริง")).toBeVisible();
    repository.getPublicDocument.mockResolvedValueOnce(null);
    await expect(DocumentRoute({ params: Promise.resolve({ locale: "en", slug: "missing" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

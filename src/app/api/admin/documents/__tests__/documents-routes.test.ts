import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({ archiveAdminDocument: vi.fn(), saveAdminDocument: vi.fn() }));
const cache = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/admin/documents/data/admin-documents-repository.server", () => repository);
vi.mock("next/cache", () => cache);

import { POST } from "@/app/api/admin/documents/route";
import { PATCH } from "@/app/api/admin/documents/[documentId]/route";
import { POST as archive } from "@/app/api/admin/documents/[documentId]/archive/route";
import { createPlainRichText } from "@/features/documents/domain/rich-text";

const documentId = "00000000-0000-4000-8000-000000000721";
const body = { category: "guide", content: { en: createPlainRichText("Guide"), th: createPlainRichText("คู่มือ") }, coverMediaId: null, displayOrder: 2, pinned: true, published: true, slug: "revision-guide", summary: { en: "Summary", th: "สรุป" }, tags: [{ en: "Guide", th: "คู่มือ" }], title: { en: "Revision Guide", th: "คู่มือการแก้งาน" } };
function request(value: unknown, url = "http://localhost/api/admin/documents", headers: Record<string, string> = {}) { return new Request(url, { body: JSON.stringify(value), headers: { "content-type": "application/json", origin: "http://localhost", ...headers }, method: "POST" }); }

beforeEach(() => { vi.clearAllMocks(); repository.saveAdminDocument.mockResolvedValue(documentId); repository.archiveAdminDocument.mockResolvedValue(undefined); });

describe("admin document routes", () => {
  it("creates valid documents and revalidates both locales", async () => {
    const response = await POST(request(body));
    expect(response.status).toBe(201);
    expect(repository.saveAdminDocument).toHaveBeenCalledWith({ ...body, id: null });
    expect(cache.revalidatePath).toHaveBeenCalledWith("/th/documents");
    expect(cache.revalidatePath).toHaveBeenCalledWith("/en/documents/revision-guide");
  });
  it("allows incomplete drafts but rejects unsafe publish content and unknown keys", async () => {
    expect((await POST(request({ ...body, content: { en: createPlainRichText(""), th: createPlainRichText("") }, published: false, summary: { en: "", th: "" }, title: { en: "", th: "" } }))).status).toBe(201);
    expect((await POST(request({ ...body, content: { ...body.content, en: { html: "<script/>", type: "html" } } }))).status).toBe(400);
    expect((await POST(request({ ...body, injected: true }))).status).toBe(400);
  });
  it("rejects cross-origin and maps duplicate slug to conflict", async () => {
    expect((await POST(request(body, undefined, { origin: "https://evil.example" }))).status).toBe(403);
    repository.saveAdminDocument.mockRejectedValueOnce(new Error("Document slug already exists"));
    expect((await POST(request(body))).status).toBe(409);
  });
  it("updates and archives only valid UUID rows", async () => {
    expect((await PATCH(request(body, `http://localhost/api/admin/documents/${documentId}`), { params: Promise.resolve({ documentId }) })).status).toBe(200);
    expect((await PATCH(request(body), { params: Promise.resolve({ documentId: "bad" }) })).status).toBe(400);
    const response = await archive(request({ archived: true, reason: "hide" }), { params: Promise.resolve({ documentId }) });
    expect(response.status).toBe(200);
    expect(repository.archiveAdminDocument).toHaveBeenCalledWith({ archived: true, documentId, reason: "hide" });
  });
});

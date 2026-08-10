import { describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/shared/supabase/server", () => supabase);

import { archiveAdminDocument, listAdminDocuments, saveAdminDocument } from "@/features/admin/documents/data/admin-documents-repository.server";
import { createPlainRichText } from "@/features/documents/domain/rich-text";

const documentId = "00000000-0000-4000-8000-000000000711";
function adminUser() { return { app_metadata: { role: "admin" }, email: "nasora.nsr300@gmail.com" }; }
function queryResult(data: unknown) { const query = { eq: vi.fn(() => query), maybeSingle: vi.fn(async () => ({ data: Array.isArray(data) ? data[0] ?? null : data, error: null })), order: vi.fn(async () => ({ data, error: null })), select: vi.fn(() => query) }; return query; }
const document = { archived_at: "2026-08-10T10:00:00.000Z", category: "terms", commission_catalog_media: null, content: { en: createPlainRichText("Terms"), th: createPlainRichText("เงื่อนไข") }, display_order: 1, id: documentId, pinned: true, published: false, slug: "commission-terms", summary: { en: "Summary", th: "สรุป" }, tags: [], title: { en: "Terms", th: "เงื่อนไข" }, updated_at: "2026-08-10T10:00:00.000Z" };

describe("admin documents repository", () => {
  it("lists archived rows for the sole admin", async () => {
    supabase.createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: adminUser() }, error: null })) }, from: vi.fn(() => queryResult([document])) });
    await expect(listAdminDocuments()).resolves.toEqual([expect.objectContaining({ archivedAt: document.archived_at, id: documentId })]);
  });

  it("rejects non-admin before database access", async () => {
    const from = vi.fn(); const rpc = vi.fn();
    supabase.createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { app_metadata: { role: "member" }, email: "member@example.com" } }, error: null })) }, from, rpc });
    await expect(listAdminDocuments()).rejects.toThrow("Admin access required");
    expect(from).not.toHaveBeenCalled(); expect(rpc).not.toHaveBeenCalled();
  });

  it("saves and archives through guarded RPCs", async () => {
    const rpc = vi.fn(async (name: string) => ({ data: name === "admin_save_public_document" ? documentId : null, error: null }));
    supabase.createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: adminUser() }, error: null })) }, rpc });
    const input = { category: "terms" as const, content: { en: createPlainRichText("Terms"), th: createPlainRichText("เงื่อนไข") }, coverMediaId: null, displayOrder: 1, id: null, pinned: true, published: false, slug: "commission-terms", summary: { en: "Summary", th: "สรุป" }, tags: [], title: { en: "Terms", th: "เงื่อนไข" } };
    await expect(saveAdminDocument(input)).resolves.toBe(documentId);
    await archiveAdminDocument({ archived: true, documentId, reason: "hide" });
    expect(rpc).toHaveBeenCalledWith("admin_save_public_document", expect.objectContaining({ p_slug: "commission-terms", p_content: input.content }));
    expect(rpc).toHaveBeenCalledWith("admin_set_public_document_archive", { p_archived: true, p_document_id: documentId, p_reason: "hide" });
  });
});

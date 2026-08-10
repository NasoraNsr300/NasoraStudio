import { describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/shared/supabase/server", () => supabase);

import {
  archiveAdminAlbum,
  listAdminAlbums,
  saveAdminAlbum,
} from "@/features/admin/catalog/data/admin-catalog-repository.server";

const albumId = "00000000-0000-4000-8000-000000000201";

function adminUser() {
  return { app_metadata: { role: "admin" }, email: "nasora.nsr300@gmail.com" };
}

function queryResult(data: unknown) {
  const query = {
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: Array.isArray(data) ? data[0] ?? null : data, error: null })),
    order: vi.fn(async () => ({ data, error: null })),
    select: vi.fn(() => query),
  };
  return query;
}

const album = {
  archived_at: "2026-08-10T10:00:00.000Z",
  availability: "closed",
  commission_catalog_media: null,
  commission_services: [],
  description: { en: "Archived album", th: "อัลบั้มเก็บถาวร" },
  display_order: 9,
  id: albumId,
  name: { en: "Archive", th: "Archive" },
  published: false,
  recommended: false,
  slug: "archive",
};

describe("admin catalog repository", () => {
  it("lists archived and active albums for the sole admin", async () => {
    const query = queryResult([album]);
    supabase.createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: adminUser() }, error: null })) },
      from: vi.fn(() => query),
    });

    const rows = await listAdminAlbums();
    expect(rows).toEqual([expect.objectContaining({ archivedAt: album.archived_at, id: albumId, serviceCount: 0 })]);
  });

  it("rejects non-admin sessions before reading or mutating", async () => {
    const from = vi.fn();
    const rpc = vi.fn();
    supabase.createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { app_metadata: { role: "member" }, email: "member@example.com" } }, error: null })) },
      from,
      rpc,
    });
    await expect(listAdminAlbums()).rejects.toThrow("Admin access required");
    await expect(saveAdminAlbum({
      availability: "open",
      coverMediaId: null,
      description: { en: "New", th: "ใหม่" },
      displayOrder: 1,
      id: null,
      name: { en: "New", th: "ใหม่" },
      published: false,
      recommended: false,
      slug: "new",
    })).rejects.toThrow("Admin access required");
    expect(from).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("saves and archives through guarded RPCs", async () => {
    const rpc = vi.fn(async (name: string) => ({ data: name === "admin_save_commission_album" ? albumId : null, error: null }));
    supabase.createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: adminUser() }, error: null })) },
      rpc,
    });
    const saved = await saveAdminAlbum({
      availability: "open",
      coverMediaId: null,
      description: { en: "New", th: "ใหม่" },
      displayOrder: 1,
      id: null,
      name: { en: "New", th: "ใหม่" },
      published: true,
      recommended: false,
      slug: "new",
    });
    await archiveAdminAlbum({ albumId, archived: true, reason: "No longer offered" });
    expect(saved).toBe(albumId);
    expect(rpc).toHaveBeenCalledWith("admin_save_commission_album", expect.objectContaining({ p_slug: "new" }));
    expect(rpc).toHaveBeenCalledWith("admin_set_commission_album_archive", {
      p_album_id: albumId,
      p_archived: true,
      p_reason: "No longer offered",
    });
  });
});

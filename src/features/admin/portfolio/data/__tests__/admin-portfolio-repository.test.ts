import { describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/shared/supabase/server", () => supabase);

import {
  archiveAdminPortfolioItem,
  listAdminPortfolio,
  saveAdminPortfolioItem,
} from "@/features/admin/portfolio/data/admin-portfolio-repository.server";

const itemId = "00000000-0000-4000-8000-000000000601";
const albumId = "00000000-0000-4000-8000-000000000602";
const mediaId = "00000000-0000-4000-8000-000000000603";

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

const row = {
  archived_at: "2026-08-10T10:00:00.000Z",
  commission_albums: { id: albumId, name: { en: "Chibi", th: "ชิบิ" }, slug: "chibi" },
  commission_catalog_media: { alt: { en: "", th: "" }, content_type: "image/png", height: 1200, id: mediaId, width: 900 },
  display_order: 2,
  featured: false,
  id: itemId,
  published: false,
  show_in_hero: false,
  title: { en: "Moon", th: "จันทร์" },
};

describe("admin portfolio repository", () => {
  it("lists archived rows for the sole admin", async () => {
    const query = queryResult([row]);
    supabase.createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: adminUser() }, error: null })) },
      from: vi.fn(() => query),
    });
    await expect(listAdminPortfolio()).resolves.toEqual([
      expect.objectContaining({ archivedAt: row.archived_at, id: itemId, mediaId }),
    ]);
  });

  it("rejects non-admin before reads or writes", async () => {
    const from = vi.fn();
    const rpc = vi.fn();
    supabase.createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { app_metadata: { role: "member" }, email: "member@example.com" } }, error: null })) },
      from,
      rpc,
    });
    await expect(listAdminPortfolio()).rejects.toThrow("Admin access required");
    await expect(saveAdminPortfolioItem({
      albumId,
      displayOrder: 0,
      featured: false,
      id: null,
      mediaId,
      published: false,
      showInHero: false,
      title: { en: "New", th: "ใหม่" },
    })).rejects.toThrow("Admin access required");
    expect(from).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("saves and archives through guarded RPCs", async () => {
    const rpc = vi.fn(async (name: string) => ({ data: name === "admin_save_portfolio_item" ? itemId : null, error: null }));
    supabase.createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: adminUser() }, error: null })) },
      rpc,
    });

    await expect(saveAdminPortfolioItem({
      albumId,
      displayOrder: 3,
      featured: true,
      id: null,
      mediaId,
      published: true,
      showInHero: true,
      title: { en: "Star", th: "ดาว" },
    })).resolves.toBe(itemId);
    await archiveAdminPortfolioItem({ archived: true, itemId, reason: "hide" });

    expect(rpc).toHaveBeenCalledWith("admin_save_portfolio_item", expect.objectContaining({
      p_album_id: albumId,
      p_media_id: mediaId,
      p_show_in_hero: true,
      p_title: { en: "Star", th: "ดาว" },
    }));
    expect(rpc).toHaveBeenCalledWith("admin_set_portfolio_item_archive", {
      p_archived: true,
      p_item_id: itemId,
      p_reason: "hide",
    });
  });
});

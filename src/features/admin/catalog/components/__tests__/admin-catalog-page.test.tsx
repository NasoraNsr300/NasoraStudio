import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ refresh: vi.fn(), useRouter: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: navigation.useRouter }));

import { AdminCatalogPage } from "@/features/admin/catalog/components/admin-catalog-page";
import type { AdminCatalogAlbum } from "@/features/catalog/domain/catalog";

const album: AdminCatalogAlbum = {
  archivedAt: null,
  availability: "open",
  coverMedia: undefined,
  description: { en: "Cute", th: "น่ารัก" },
  displayOrder: 1,
  id: "00000000-0000-4000-8000-000000000401",
  name: { en: "Chibi", th: "Chibi" },
  published: true,
  recommended: true,
  serviceCount: 2,
  services: [],
  slug: "chibi",
};

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  navigation.useRouter.mockReturnValue({ refresh: navigation.refresh });
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ archived: true }), { status: 200 })));
  vi.stubGlobal("confirm", vi.fn(() => true));
});

describe("AdminCatalogPage", () => {
  it("shows a real empty state and Add Album navigation without fixture cards", () => {
    render(<AdminCatalogPage albums={[]} />);
    expect(screen.getByText("ยังไม่มีอัลบั้ม")).toBeVisible();
    expect(screen.getAllByRole("link", { name: "เพิ่มอัลบั้ม" })[0]).toHaveAttribute("href", "/admin/catalog/new");
    expect(screen.queryByText("VTuber")).not.toBeInTheDocument();
  });

  it("renders supplied rows and makes search, status filter, sort, and edit navigation work", async () => {
    const user = userEvent.setup();
    const archived = { ...album, archivedAt: "2026-08-10T10:00:00.000Z", availability: "closed" as const, id: "00000000-0000-4000-8000-000000000402", name: { en: "Old", th: "เก่า" }, slug: "old" };
    render(<AdminCatalogPage albums={[archived, album]} />);

    expect(screen.getByRole("link", { name: "แก้ไขอัลบั้ม Chibi" })).toHaveAttribute("href", `/admin/catalog/${album.id}`);
    await user.type(screen.getByPlaceholderText("ค้นหาอัลบั้มหรือรูปแบบงาน..."), "เก่า");
    expect(screen.getByRole("heading", { name: "เก่า" })).toBeVisible();
    expect(screen.queryByText("Chibi")).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("ค้นหาอัลบั้มหรือรูปแบบงาน..."));
    await user.selectOptions(screen.getByLabelText("กรองสถานะอัลบั้ม"), "active");
    expect(screen.getByRole("heading", { name: "Chibi" })).toBeVisible();
    expect(screen.queryByText("เก่า")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("เรียงอัลบั้ม"), "name");
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });

  it("archives and restores through the API then refreshes server data", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    const { rerender } = render(<AdminCatalogPage albums={[album]} />);
    await user.click(screen.getByRole("button", { name: "เก็บอัลบั้ม Chibi เป็นรายการถาวร" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`/api/admin/catalog/albums/${album.id}/archive`, expect.objectContaining({ method: "POST" })));
    expect(navigation.refresh).toHaveBeenCalled();

    rerender(<AdminCatalogPage albums={[{ ...album, archivedAt: "2026-08-10T10:00:00.000Z" }]} />);
    await user.click(screen.getByRole("button", { name: "กู้คืนอัลบั้ม Chibi" }));
    expect(fetchMock).toHaveBeenLastCalledWith(`/api/admin/catalog/albums/${album.id}/archive`, expect.objectContaining({ body: JSON.stringify({ archived: false, reason: null }) }));
  });
});

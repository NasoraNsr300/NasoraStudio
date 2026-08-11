import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ refresh: vi.fn(), useRouter: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: navigation.useRouter }));

import { AdminPortfolioPage } from "@/features/admin/portfolio/components/admin-portfolio-page";
import type { AdminPortfolioItem } from "@/features/portfolio/domain/portfolio";

const item: AdminPortfolioItem = {
  albumId: "00000000-0000-4000-8000-000000000401",
  archivedAt: null,
  category: "illustration",
  categoryName: { en: "Illustration", th: "ภาพประกอบ" },
  displayOrder: 1,
  featured: true,
  id: "00000000-0000-4000-8000-000000000402",
  media: {
    alt: { en: "Moon", th: "ดวงจันทร์" },
    cardSrc: "/api/portfolio/media/00000000-0000-4000-8000-000000000403",
    contentType: "image/webp",
    detailSrc: "/api/portfolio/media/00000000-0000-4000-8000-000000000403",
    height: 1600,
    id: "00000000-0000-4000-8000-000000000403",
    width: 1200,
  },
  mediaId: "00000000-0000-4000-8000-000000000403",
  published: true,
  showInHero: false,
  title: { en: "Moon Garden", th: "สวนจันทร์" },
};

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  navigation.useRouter.mockReturnValue({ refresh: navigation.refresh });
  vi.stubGlobal("confirm", vi.fn(() => true));
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ archived: true }), { status: 200 })));
});

describe("AdminPortfolioPage", () => {
  it("shows an honest empty state and real Add navigation without fixture cards", () => {
    const { container } = render(<AdminPortfolioPage items={[]} />);
    expect(screen.getByText("ยังไม่มีผลงาน")).toBeVisible();
    expect(screen.getAllByRole("link", { name: "เพิ่มผลงาน" })[0]).toHaveAttribute("href", "/admin/portfolio/new");
    expect(container.innerHTML).not.toContain("/fixtures/");
  });

  it("renders database items and supports search and edit navigation", async () => {
    const user = userEvent.setup();
    const archived = { ...item, archivedAt: "2026-08-10T10:00:00.000Z", id: "00000000-0000-4000-8000-000000000404", title: { en: "Old Star", th: "ดาวเก่า" } };
    render(<AdminPortfolioPage items={[item, archived]} />);
    expect(screen.getByRole("link", { name: "แก้ไข สวนจันทร์" })).toHaveAttribute("href", `/admin/portfolio/${item.id}`);
    await user.type(screen.getByPlaceholderText("ค้นหาชื่อผลงานหรือหมวดหมู่..."), "ดาวเก่า");
    expect(screen.getByText("ดาวเก่า")).toBeVisible();
    expect(screen.queryByText("สวนจันทร์")).not.toBeInTheDocument();
  });

  it("archives and restores through the API then refreshes server data", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    const { rerender } = render(<AdminPortfolioPage items={[item]} />);
    await user.click(screen.getByRole("button", { name: "เก็บถาวร สวนจันทร์" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`/api/admin/portfolio/items/${item.id}/archive`, expect.objectContaining({ method: "POST" })));
    expect(navigation.refresh).toHaveBeenCalled();

    rerender(<AdminPortfolioPage items={[{ ...item, archivedAt: "2026-08-10T10:00:00.000Z" }]} />);
    await user.click(screen.getByRole("button", { name: "กู้คืน สวนจันทร์" }));
    expect(fetchMock).toHaveBeenLastCalledWith(`/api/admin/portfolio/items/${item.id}/archive`, expect.objectContaining({ body: JSON.stringify({ archived: false, reason: null }) }));
  });
});

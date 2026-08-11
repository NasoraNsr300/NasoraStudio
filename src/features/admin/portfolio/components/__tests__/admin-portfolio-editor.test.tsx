import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn(), useRouter: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: navigation.useRouter }));

import { AdminPortfolioEditor } from "@/features/admin/portfolio/components/admin-portfolio-editor";
import type { AdminPortfolioItem } from "@/features/portfolio/domain/portfolio";

const album = { id: "00000000-0000-4000-8000-000000000411", name: { en: "Illustration", th: "ภาพประกอบ" }, published: true, slug: "illustration" };
const itemId = "00000000-0000-4000-8000-000000000412";
const mediaId = "00000000-0000-4000-8000-000000000413";
const item: AdminPortfolioItem = {
  albumId: album.id, archivedAt: null, category: album.slug, categoryName: album.name,
  displayOrder: 1, featured: true, id: itemId, showInHero: true,
  media: { alt: { en: "Moon", th: "จันทร์" }, cardSrc: `/api/portfolio/media/${mediaId}`, contentType: "image/webp", detailSrc: `/api/portfolio/media/${mediaId}`, height: 1600, id: mediaId, width: 1200 },
  mediaId, published: true, title: { en: "Moon Garden", th: "สวนจันทร์" },
};

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  navigation.useRouter.mockReturnValue({ refresh: navigation.refresh, replace: navigation.replace });
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ close: vi.fn(), height: 1600, width: 1200 })));
});

describe("AdminPortfolioEditor", () => {
  it("uploads an image then creates a portfolio item using its permanent media id", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ mediaId, src: `/api/portfolio/media/${mediaId}` }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ itemId }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminPortfolioEditor albums={[album]} initialItem={null} />);

    await user.type(screen.getByLabelText("ชื่อผลงาน (TH)"), "สวนจันทร์");
    await user.type(screen.getByLabelText("Title (EN)"), "Moon Garden");
    await user.click(screen.getByRole("checkbox", { name: "แสดงใน Hero" }));
    await user.upload(screen.getByLabelText("รูปผลงาน"), new File([new Uint8Array([137, 80, 78, 71])], "moon.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "อัปโหลดรูปผลงาน" }));
    await screen.findByText("อัปโหลดรูปแล้ว");
    await user.click(screen.getByRole("button", { name: "บันทึกผลงาน" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const payload = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(payload).toEqual(expect.objectContaining({ albumId: album.id, mediaId, showInHero: true, title: { en: "Moon Garden", th: "สวนจันทร์" } }));
    expect(navigation.replace).toHaveBeenCalledWith(`/admin/portfolio/${itemId}`);
  });

  it("keeps edited fields after a failed save and allows a retry", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "บันทึกไม่สำเร็จ" }), { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ itemId }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminPortfolioEditor albums={[album]} initialItem={item} />);
    const title = screen.getByLabelText("ชื่อผลงาน (TH)");
    await user.clear(title);
    await user.type(title, "ชื่อใหม่");
    await user.click(screen.getByRole("button", { name: "บันทึกผลงาน" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("บันทึกไม่สำเร็จ");
    expect(title).toHaveValue("ชื่อใหม่");
    await user.click(screen.getByRole("button", { name: "บันทึกผลงาน" }));
    await waitFor(() => expect(navigation.refresh).toHaveBeenCalled());
  });
});

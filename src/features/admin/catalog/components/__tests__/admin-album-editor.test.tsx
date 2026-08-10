import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn(), useRouter: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: navigation.useRouter }));

import { AdminAlbumEditor } from "@/features/admin/catalog/components/admin-album-editor";
import type { AdminCatalogAlbum } from "@/features/catalog/domain/catalog";

const albumId = "00000000-0000-4000-8000-000000000411";
const serviceId = "00000000-0000-4000-8000-000000000412";
const album: AdminCatalogAlbum = {
  archivedAt: null,
  availability: "open",
  coverMedia: undefined,
  description: { en: "Cute", th: "น่ารัก" },
  displayOrder: 1,
  id: albumId,
  name: { en: "Chibi", th: "Chibi" },
  published: true,
  recommended: true,
  serviceCount: 1,
  services: [{
    albumId,
    archivedAt: null,
    availability: "open",
    coverMedia: undefined,
    description: { en: "Full body", th: "เต็มตัว" },
    displayOrder: 1,
    documentSlugs: ["commission-terms"],
    freeRevisionCount: 4,
    id: serviceId,
    modifiers: [],
    name: { en: "Full Body", th: "Full Body" },
    prices: [{ amountSatang: 140000, displayOrder: 1, label: { en: "Personal Normal", th: "ส่วนตัว ปกติ" }, pace: "normal", usage: "personal" }],
    published: true,
    slug: "full-body",
    timingGuidance: { en: "7 days", th: "7 วัน" },
  }],
  slug: "chibi",
};

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  navigation.useRouter.mockReturnValue({ refresh: navigation.refresh, replace: navigation.replace });
});

describe("AdminAlbumEditor", () => {
  it("creates an album with localized fields and navigates to its real editor", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ albumId }), { status: 201 })));
    render(<AdminAlbumEditor initialAlbum={null} />);

    await user.type(screen.getByLabelText("ชื่ออัลบั้ม (TH)"), "งานใหม่");
    await user.type(screen.getByLabelText("Album name (EN)"), "New Work");
    await user.type(screen.getByLabelText("Slug"), "new-work");
    await user.click(screen.getByRole("button", { name: "บันทึกอัลบั้ม" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/admin/catalog/albums", expect.objectContaining({ method: "POST" })));
    expect(navigation.replace).toHaveBeenCalledWith(`/admin/catalog/${albumId}`);
  });

  it("updates album fields and keeps API errors inside the editor", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Slug ซ้ำ" }), { status: 409 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ albumId }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminAlbumEditor initialAlbum={album} />);
    await user.clear(screen.getByLabelText("คำอธิบาย (TH)"));
    await user.type(screen.getByLabelText("คำอธิบาย (TH)"), "คำอธิบายใหม่");
    await user.click(screen.getByRole("button", { name: "บันทึกอัลบั้ม" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Slug ซ้ำ");
    await user.click(screen.getByRole("button", { name: "บันทึกอัลบั้ม" }));
    await waitFor(() => expect(navigation.refresh).toHaveBeenCalled());
  });

  it("edits a sub-album service and stores its THB price as exact satang", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/prices")) return new Response(JSON.stringify({ serviceId }), { status: 200 });
      return new Response(JSON.stringify({ serviceId }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminAlbumEditor initialAlbum={album} />);

    await user.click(screen.getByRole("button", { name: "แก้ไขรูปแบบ Full Body" }));
    const price = screen.getByLabelText("ราคา Personal Normal (THB)");
    await user.clear(price);
    await user.type(price, "1500.25");
    await user.click(screen.getByRole("button", { name: "บันทึกรูปแบบย่อย" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const priceCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/prices"));
    expect(JSON.parse(String(priceCall?.[1]?.body))).toEqual(expect.objectContaining({
      prices: expect.arrayContaining([expect.objectContaining({ amountSatang: 150025, pace: "normal", usage: "personal" })]),
    }));
  });

  it("uploads a real album cover and saves its media id on the album", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ mediaId: "00000000-0000-4000-8000-000000000413", src: "/api/catalog/media/00000000-0000-4000-8000-000000000413" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ albumId }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ close: vi.fn(), height: 1500, width: 1200 })));
    render(<AdminAlbumEditor initialAlbum={album} />);

    await user.upload(screen.getByLabelText("ภาพปกอัลบั้ม"), new File([new Uint8Array([137, 80, 78, 71])], "cover.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "อัปโหลดภาพปกอัลบั้ม" }));
    await screen.findByText("อัปโหลดภาพปกอัลบั้มแล้ว");
    await user.click(screen.getByRole("button", { name: "บันทึกอัลบั้ม" }));

    const saveCall = fetchMock.mock.calls.find(([url]) => String(url).includes(`/albums/${albumId}`));
    expect(JSON.parse(String(saveCall?.[1]?.body))).toEqual(expect.objectContaining({
      coverMediaId: "00000000-0000-4000-8000-000000000413",
    }));
  });
});

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminDocumentsPage } from "@/features/admin/documents/components/admin-documents-page";
import { createPlainRichText } from "@/features/documents/domain/rich-text";

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const item = { archivedAt: null, category: "guide", content: { en: createPlainRichText("Guide"), th: createPlainRichText("คู่มือ") }, coverMediaId: null, displayOrder: 2, id: "00000000-0000-4000-8000-000000000751", pinned: true, published: true, slug: "revision-guide", summary: { en: "Summary", th: "สรุป" }, tags: [], title: { en: "Revision Guide", th: "คู่มือแก้งาน" }, updatedAt: "2026-08-10T10:00:00.000Z" };

describe("AdminDocumentsPage", () => {
  it("renders live IDs, real edit links, and filters without mock rows", () => {
    render(<AdminDocumentsPage documents={[item]} />);
    expect(screen.getByRole("link", { name: /แก้ไข คู่มือแก้งาน/ })).toHaveAttribute("href", `/admin/documents/${item.id}`);
    expect(screen.getByRole("link", { name: /สร้างเอกสาร/ })).toHaveAttribute("href", "/admin/documents/new");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "ไม่พบ" } });
    expect(screen.queryByText("คู่มือแก้งาน")).not.toBeInTheDocument();
  });
  it("archives through the live API and refreshes", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    render(<AdminDocumentsPage documents={[item]} />);
    fireEvent.click(screen.getByRole("button", { name: /เก็บถาวร คู่มือแก้งาน/ }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith(`/api/admin/documents/${item.id}/archive`, expect.objectContaining({ method: "POST" }));
  });
});

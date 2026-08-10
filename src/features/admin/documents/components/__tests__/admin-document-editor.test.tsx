import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminDocumentEditor } from "@/features/admin/documents/components/admin-document-editor";
import { createPlainRichText } from "@/features/documents/domain/rich-text";

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/features/admin/documents/components/document-rich-text-editor", () => ({ DocumentRichTextEditor: ({ label, onChange }: { label: string; onChange(value: unknown): void }) => <button onClick={() => onChange(createPlainRichText(`${label} text`))} type="button">Set {label}</button> }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("AdminDocumentEditor", () => {
  it("keeps independent Thai and English content and sends validated save payload", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ documentId: "00000000-0000-4000-8000-000000000761" }), { status: 201 }));
    render(<AdminDocumentEditor document={null} />);
    fireEvent.change(screen.getByLabelText("Slug"), { target: { value: "new-guide" } });
    fireEvent.change(screen.getByLabelText("ชื่อภาษาไทย"), { target: { value: "คู่มือใหม่" } }); fireEvent.change(screen.getByLabelText("ชื่อภาษาอังกฤษ"), { target: { value: "New Guide" } });
    fireEvent.change(screen.getByLabelText("สรุปภาษาไทย"), { target: { value: "สรุป" } }); fireEvent.change(screen.getByLabelText("สรุปภาษาอังกฤษ"), { target: { value: "Summary" } });
    fireEvent.click(screen.getByRole("button", { name: "Set เนื้อหาภาษาไทย" })); fireEvent.click(screen.getByRole("button", { name: "Set English content" }));
    fireEvent.click(screen.getByLabelText("เผยแพร่")); fireEvent.click(screen.getByRole("button", { name: "บันทึกเอกสาร" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const payload = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(payload.content.th.children[0].children[0].text).toContain("ภาษาไทย");
    expect(payload.content.en.children[0].children[0].text).toContain("English");
  });
  it("retains draft values and reports failed saves", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: "บันทึกไม่สำเร็จ" }), { status: 400 }));
    render(<AdminDocumentEditor document={null} />);
    fireEvent.change(screen.getByLabelText("Slug"), { target: { value: "draft" } }); fireEvent.click(screen.getByRole("button", { name: "บันทึกเอกสาร" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("บันทึกไม่สำเร็จ");
    expect(screen.getByLabelText("Slug")).toHaveValue("draft");
  });
});

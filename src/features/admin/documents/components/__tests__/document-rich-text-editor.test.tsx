import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DocumentRichTextEditor } from "@/features/admin/documents/components/document-rich-text-editor";
import { createPlainRichText } from "@/features/documents/domain/rich-text";

describe("DocumentRichTextEditor", () => {
  it("offers only the approved rich-text toolbar and an editable Lexical surface", () => {
    render(<DocumentRichTextEditor label="เนื้อหา" onChange={vi.fn()} value={createPlainRichText("เริ่มเขียน")} />);
    for (const name of ["ย่อหน้า", "หัวข้อ 2", "ตัวหนา", "ขีดเส้นใต้", "ชิดซ้าย", "รายการ", "ลิงก์", "เส้นคั่น", "ย้อนกลับ"]) expect(screen.getByRole("button", { name })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "เนื้อหา" })).toBeVisible();
    expect(screen.queryByRole("button", { name: /HTML/i })).not.toBeInTheDocument();
  });
});

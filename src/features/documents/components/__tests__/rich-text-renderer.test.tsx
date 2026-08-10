import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RichTextRenderer } from "@/features/documents/components/rich-text-renderer";
import { parseSafeRichText } from "@/features/documents/domain/rich-text";

describe("RichTextRenderer", () => {
  it("renders approved structure and tokens without raw HTML", () => {
    const document = parseSafeRichText({ children: [
      { align: "center", children: [{ bold: true, color: "red", highlight: "yellow", text: "หัวข้อ", type: "text" }], level: 2, type: "heading" },
      { children: [{ children: [{ text: "ข้อหนึ่ง", type: "text" }], type: "listitem" }], ordered: true, type: "list" },
      { align: "right", children: [{ children: [{ underline: true, text: "เว็บไซต์", type: "text" }], type: "link", url: "https://example.com" }], type: "paragraph" },
      { type: "horizontalrule" },
    ], type: "root" });
    const { container } = render(<RichTextRenderer document={document} />);
    expect(screen.getByRole("heading", { level: 2, name: "หัวข้อ" })).toHaveAttribute("data-align", "center");
    expect(screen.getByRole("list")).toBeInstanceOf(HTMLOListElement);
    expect(screen.getByRole("link", { name: "เว็บไซต์" })).toHaveAttribute("href", "https://example.com");
    expect(container.querySelector("[data-color='red'][data-highlight='yellow']")).toBeInTheDocument();
    expect(container.querySelector("hr")).toBeInTheDocument();
    expect(container.innerHTML).not.toContain("dangerouslySetInnerHTML");
  });
});

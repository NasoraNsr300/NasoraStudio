import { describe, expect, it } from "vitest";

import { hasRichTextContent, parseSafeRichText } from "@/features/documents/domain/rich-text";

const validDocument = {
  children: [{ align: "center", children: [{ bold: true, color: "red", text: "ข้อกำหนด", type: "text" }], level: 2, type: "heading" }, {
    align: "left", children: [{ text: "อ่าน ", type: "text" }, { children: [{ text: "รายละเอียด", underline: true, type: "text" }], type: "link", url: "/th/documents/details" }], type: "paragraph",
  }, { children: [{ children: [{ text: "ข้อแรก", type: "text" }], type: "listitem" }], ordered: false, type: "list" }, { type: "horizontalrule" }],
  type: "root",
} as const;

describe("safe rich text", () => {
  it("accepts approved nodes, marks, alignment and safe links", () => {
    expect(parseSafeRichText(validDocument)).toEqual(validDocument);
    expect(hasRichTextContent(validDocument)).toBe(true);
  });

  it.each([
    { children: [{ html: "<script>alert(1)</script>", type: "html" }], type: "root" },
    { children: [{ align: "left", children: [{ children: [{ text: "bad", type: "text" }], type: "link", url: "javascript:alert(1)" }], type: "paragraph" }], type: "root" },
    { children: [{ align: "left", children: [{ style: "font-size:99px", text: "bad", type: "text" }], type: "paragraph" }], type: "root" },
  ])("rejects unsafe or unknown content", (value) => {
    expect(() => parseSafeRichText(value)).toThrow(/invalid_rich_text/);
  });

  it("rejects excessive nesting and treats whitespace-only roots as empty", () => {
    let child: unknown = { align: "left", children: [{ text: "x", type: "text" }], type: "paragraph" };
    for (let index = 0; index < 13; index += 1) child = { children: [{ children: [child], type: "listitem" }], ordered: false, type: "list" };
    expect(() => parseSafeRichText({ children: [child], type: "root" })).toThrow("invalid_rich_text_depth");
    expect(hasRichTextContent({ children: [{ align: "left", children: [{ text: "   ", type: "text" }], type: "paragraph" }], type: "root" })).toBe(false);
  });
});

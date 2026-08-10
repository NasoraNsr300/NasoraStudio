import { z } from "zod";

export type RichTextAlign = "center" | "left" | "right";
export type RichTextColor = "default" | "gold" | "red" | "violet";
export type RichTextHighlight = "none" | "rose" | "yellow";
export type RichTextTextNode = { bold?: boolean; color?: RichTextColor; highlight?: RichTextHighlight; text: string; type: "text"; underline?: boolean };
export type RichTextLinkNode = { children: RichTextTextNode[]; type: "link"; url: string };
export type RichTextLineBreakNode = { type: "linebreak" };
export type RichTextInlineNode = RichTextTextNode | RichTextLinkNode | RichTextLineBreakNode;
export type RichTextParagraphNode = { align: RichTextAlign; children: RichTextInlineNode[]; type: "paragraph" };
export type RichTextHeadingNode = { align: RichTextAlign; children: RichTextInlineNode[]; level: 2 | 3 | 4; type: "heading" };
export type RichTextListItemNode = { children: Array<RichTextInlineNode | RichTextListNode>; type: "listitem" };
export type RichTextListNode = { children: RichTextListItemNode[]; ordered: boolean; type: "list" };
export type RichTextHorizontalRuleNode = { type: "horizontalrule" };
export type RichTextBlockNode = RichTextParagraphNode | RichTextHeadingNode | RichTextListNode | RichTextHorizontalRuleNode;
export type SafeRichTextDocument = { children: RichTextBlockNode[]; type: "root" };

const textSchema: z.ZodType<RichTextTextNode> = z.object({
  bold: z.boolean().optional(), color: z.enum(["default", "gold", "red", "violet"]).optional(),
  highlight: z.enum(["none", "rose", "yellow"]).optional(), text: z.string().max(100_000), type: z.literal("text"), underline: z.boolean().optional(),
}).strict();
const linkSchema: z.ZodType<RichTextLinkNode> = z.object({ children: z.array(textSchema).max(2_000), type: z.literal("link"), url: z.string().max(2_048).refine((url) => {
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try { return ["http:", "https:"].includes(new URL(url).protocol); } catch { return false; }
}, "invalid_rich_text_link") }).strict();
const lineBreakSchema: z.ZodType<RichTextLineBreakNode> = z.object({ type: z.literal("linebreak") }).strict();
const inlineSchema: z.ZodType<RichTextInlineNode> = z.union([textSchema, linkSchema, lineBreakSchema]);
const listSchema: z.ZodType<RichTextListNode> = z.lazy(() => z.object({
  children: z.array(z.object({ children: z.array(z.union([inlineSchema, listSchema])).max(2_000), type: z.literal("listitem") }).strict()).max(2_000),
  ordered: z.boolean(), type: z.literal("list"),
}).strict());
const blockSchema: z.ZodType<RichTextBlockNode> = z.union([
  z.object({ align: z.enum(["left", "center", "right"]), children: z.array(inlineSchema).max(2_000), type: z.literal("paragraph") }).strict(),
  z.object({ align: z.enum(["left", "center", "right"]), children: z.array(inlineSchema).max(2_000), level: z.union([z.literal(2), z.literal(3), z.literal(4)]), type: z.literal("heading") }).strict(),
  listSchema,
  z.object({ type: z.literal("horizontalrule") }).strict(),
]);
const documentSchema: z.ZodType<SafeRichTextDocument> = z.object({ children: z.array(blockSchema).max(2_000), type: z.literal("root") }).strict();

function walk(value: unknown, depth: number, state: { nodes: number; text: number }) {
  if (depth > 12) throw new Error("invalid_rich_text_depth");
  if (!value || typeof value !== "object") return;
  state.nodes += 1; if (state.nodes > 2_000) throw new Error("invalid_rich_text_nodes");
  const row = value as Record<string, unknown>;
  if (typeof row.text === "string") { state.text += row.text.length; if (state.text > 100_000) throw new Error("invalid_rich_text_length"); }
  if (Array.isArray(row.children)) for (const child of row.children) walk(child, depth + 1, state);
}

export function parseSafeRichText(value: unknown): SafeRichTextDocument {
  walk(value, 0, { nodes: 0, text: 0 });
  const parsed = documentSchema.safeParse(value);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue) => issue.message);
    if (messages.includes("invalid_rich_text_link")) throw new Error("invalid_rich_text_link");
    const keys = value && typeof value === "object" ? JSON.stringify(value) : "";
    if (keys.includes('"style"')) throw new Error("invalid_rich_text_style");
    throw new Error("invalid_rich_text");
  }
  return parsed.data;
}

export function createPlainRichText(text: string): SafeRichTextDocument {
  return { children: [{ align: "left", children: [{ text, type: "text" }], type: "paragraph" }], type: "root" };
}

export function richTextPlainText(document: SafeRichTextDocument) {
  const values: string[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return; const row = node as Record<string, unknown>;
    if (typeof row.text === "string") values.push(row.text);
    if (Array.isArray(row.children)) row.children.forEach(visit);
  };
  visit(document); return values.join(" ");
}

export function hasRichTextContent(value: unknown) {
  try { return richTextPlainText(parseSafeRichText(value)).trim().length > 0; } catch { return false; }
}

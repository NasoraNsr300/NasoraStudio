"use client";

import { $createHeadingNode, $isHeadingNode, HeadingNode } from "@lexical/rich-text";
import { $createListItemNode, $createListNode, $isListItemNode, $isListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, ListItemNode, ListNode } from "@lexical/list";
import { $createLinkNode, $isLinkNode, LinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { $patchStyleText, $setBlocksType } from "@lexical/selection";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { HorizontalRuleNode, INSERT_HORIZONTAL_RULE_COMMAND, $isHorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createLineBreakNode, $createParagraphNode, $createTextNode, $getRoot, $getSelection, $isElementNode, $isLineBreakNode, $isParagraphNode, $isRangeSelection, $isTextNode, COMMAND_PRIORITY_EDITOR, FORMAT_ELEMENT_COMMAND, FORMAT_TEXT_COMMAND, REDO_COMMAND, UNDO_COMMAND, type EditorState, type LexicalNode } from "lexical";

import { parseSafeRichText, type RichTextBlockNode, type RichTextInlineNode, type RichTextListItemNode, type RichTextListNode, type SafeRichTextDocument } from "@/features/documents/domain/rich-text";

import styles from "./admin-document-editor.module.css";

const colors = { default: "", gold: "#f8c85a", red: "#ff6b6b", violet: "#b8a0ff" } as const;
const highlights = { none: "", rose: "#6b334b", yellow: "#705a18" } as const;

function appendInline(parent: { append(...nodes: LexicalNode[]): unknown }, node: RichTextInlineNode) {
  if (node.type === "linebreak") { parent.append($createLineBreakNode()); return; }
  if (node.type === "link") { const link = $createLinkNode(node.url); node.children.forEach((child) => appendInline(link, child)); parent.append(link); return; }
  const text = $createTextNode(node.text); if (node.bold) text.toggleFormat("bold"); if (node.underline) text.toggleFormat("underline");
  const style = [`color:${colors[node.color ?? "default"]}`, `background-color:${highlights[node.highlight ?? "none"]}`].filter((part) => !part.endsWith(":" )).join(";"); if (style) text.setStyle(style); parent.append(text);
}
function appendList(parent: { append(...nodes: LexicalNode[]): unknown }, node: RichTextListNode) {
  const list = $createListNode(node.ordered ? "number" : "bullet");
  for (const item of node.children) { const listItem = $createListItemNode(); for (const child of item.children) child.type === "list" ? appendList(listItem, child) : appendInline(listItem, child); list.append(listItem); }
  parent.append(list);
}
function initialize(value: SafeRichTextDocument) {
  const root = $getRoot(); root.clear();
  for (const block of value.children) {
    if (block.type === "horizontalrule") { root.append(new HorizontalRuleNode()); continue; }
    if (block.type === "list") { appendList(root, block); continue; }
    const element = block.type === "heading" ? $createHeadingNode(`h${block.level}` as "h2" | "h3" | "h4") : $createParagraphNode();
    element.setFormat(block.align); block.children.forEach((child) => appendInline(element, child)); root.append(element);
  }
  if (root.getChildrenSize() === 0) root.append($createParagraphNode());
}
function styleToken(style: string, property: string) { return style.split(";").map((part) => part.split(":").map((value) => value.trim())).find(([key]) => key === property)?.[1] ?? ""; }
function inlineNode(node: LexicalNode): RichTextInlineNode | null {
  if ($isTextNode(node)) { const style = node.getStyle(); const colorValue = styleToken(style, "color"); const highlightValue = styleToken(style, "background-color"); const color = (Object.entries(colors).find(([, value]) => value === colorValue)?.[0] ?? "default") as keyof typeof colors; const highlight = (Object.entries(highlights).find(([, value]) => value === highlightValue)?.[0] ?? "none") as keyof typeof highlights; return { bold: node.hasFormat("bold") || undefined, color, highlight, text: node.getTextContent(), type: "text", underline: node.hasFormat("underline") || undefined }; }
  if ($isLineBreakNode(node)) return { type: "linebreak" };
  if ($isLinkNode(node)) return { children: node.getChildren().map(inlineNode).filter((child): child is Extract<RichTextInlineNode, { type: "text" }> => child?.type === "text"), type: "link", url: node.getURL() };
  return null;
}
function listNode(node: ListNode): RichTextListNode { return { children: node.getChildren().filter($isListItemNode).map((item): RichTextListItemNode => ({ children: item.getChildren().map((child) => $isListNode(child) ? listNode(child) : inlineNode(child)).filter((child): child is RichTextInlineNode | RichTextListNode => child !== null), type: "listitem" })), ordered: node.getListType() === "number", type: "list" }; }
function serialize(): SafeRichTextDocument {
  const children: RichTextBlockNode[] = [];
  for (const node of $getRoot().getChildren()) {
    if ($isHorizontalRuleNode(node)) { children.push({ type: "horizontalrule" }); continue; }
    if ($isListNode(node)) { children.push(listNode(node)); continue; }
    if ($isParagraphNode(node) || $isHeadingNode(node)) {
      const inline = node.getChildren().map(inlineNode).filter((child): child is RichTextInlineNode => child !== null);
      const align = $isElementNode(node) && ["left", "center", "right"].includes(node.getFormatType()) ? node.getFormatType() as "left" | "center" | "right" : "left";
      if ($isHeadingNode(node)) children.push({ align, children: inline, level: Number(node.getTag().slice(1)) as 2 | 3 | 4, type: "heading" }); else children.push({ align, children: inline, type: "paragraph" });
    }
  }
  return parseSafeRichText({ children, type: "root" });
}

function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const block = (kind: "paragraph" | 2 | 3 | 4) => editor.update(() => { const selection = $getSelection(); if ($isRangeSelection(selection)) $setBlocksType(selection, () => kind === "paragraph" ? $createParagraphNode() : $createHeadingNode(`h${kind}`)); });
  const style = (property: "color" | "background-color", value: string) => editor.update(() => { const selection = $getSelection(); if ($isRangeSelection(selection)) $patchStyleText(selection, { [property]: value }); });
  return <div className={styles.richToolbar} role="toolbar">
    <button aria-label="ย้อนกลับ" onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} type="button">↶</button><button aria-label="ทำซ้ำ" onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} type="button">↷</button>
    <button aria-label="ย่อหน้า" onClick={() => block("paragraph")} type="button">P</button>{([2, 3, 4] as const).map((level) => <button aria-label={`หัวข้อ ${level}`} key={level} onClick={() => block(level)} type="button">H{level}</button>)}
    <button aria-label="ตัวหนา" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")} type="button"><b>B</b></button><button aria-label="ขีดเส้นใต้" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")} type="button"><u>U</u></button>
    <button aria-label="ชิดซ้าย" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left")} type="button">≡</button><button aria-label="กึ่งกลาง" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center")} type="button">≡</button><button aria-label="ชิดขวา" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right")} type="button">≡</button>
    <button aria-label="รายการ" onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)} type="button">•</button><button aria-label="รายการตัวเลข" onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)} type="button">1.</button>
    <button aria-label="ลิงก์" onClick={() => { const url = window.prompt("URL"); if (url) editor.dispatchCommand(TOGGLE_LINK_COMMAND, url); }} type="button">↗</button><button aria-label="เส้นคั่น" onClick={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)} type="button">―</button>
    <button aria-label="สีแดง" onClick={() => style("color", colors.red)} type="button">R</button><button aria-label="สีทอง" onClick={() => style("color", colors.gold)} type="button">G</button><button aria-label="ไฮไลต์เหลือง" onClick={() => style("background-color", highlights.yellow)} type="button">▰</button>
  </div>;
}

export function DocumentRichTextEditor({ label, onChange, value }: { label: string; onChange(value: SafeRichTextDocument): void; value: SafeRichTextDocument }) {
  return <div className={styles.richEditor}><span>{label}</span><LexicalComposer initialConfig={{ editorState: () => initialize(value), namespace: `document-${label}`, nodes: [HeadingNode, ListNode, ListItemNode, LinkNode, HorizontalRuleNode], onError: (error) => { throw error; }, theme: {} }}>
    <Toolbar /><RichTextPlugin contentEditable={<ContentEditable aria-label={label} className={styles.editorSurface} />} ErrorBoundary={({ children }) => children} placeholder={<div className={styles.placeholder}>เริ่มเขียนเนื้อหา…</div>} />
    <HistoryPlugin /><ListPlugin /><LinkPlugin /><AutoFocusPlugin /><OnChangePlugin onChange={(state: EditorState) => state.read(() => onChange(serialize()))} />
  </LexicalComposer></div>;
}

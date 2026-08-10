import type { ReactNode } from "react";

import type { RichTextInlineNode, RichTextListNode, SafeRichTextDocument } from "@/features/documents/domain/rich-text";

import styles from "./rich-text-renderer.module.css";

function inline(nodes: RichTextInlineNode[]): ReactNode {
  return nodes.map((node, index) => {
    if (node.type === "linebreak") return <br key={index} />;
    if (node.type === "link") return <a href={node.url} key={index} rel={node.url.startsWith("http") ? "noopener noreferrer" : undefined}>{inline(node.children)}</a>;
    return <span data-bold={node.bold || undefined} data-color={node.color ?? "default"} data-highlight={node.highlight ?? "none"} data-underline={node.underline || undefined} key={index}>{node.text}</span>;
  });
}

function list(node: RichTextListNode, key: number): ReactNode {
  const children = node.children.map((item, index) => <li key={index}>{item.children.map((child, childIndex) => child.type === "list" ? list(child, childIndex) : <span key={childIndex}>{inline([child])}</span>)}</li>);
  return node.ordered ? <ol key={key}>{children}</ol> : <ul key={key}>{children}</ul>;
}

export function RichTextRenderer({ document }: { document: SafeRichTextDocument }) {
  return <div className={styles.richText}>{document.children.map((node, index) => {
    if (node.type === "horizontalrule") return <hr key={index} />;
    if (node.type === "list") return list(node, index);
    const content = inline(node.children);
    if (node.type === "paragraph") return <p data-align={node.align} key={index}>{content}</p>;
    if (node.level === 2) return <h2 data-align={node.align} key={index}>{content}</h2>;
    if (node.level === 3) return <h3 data-align={node.align} key={index}>{content}</h3>;
    return <h4 data-align={node.align} key={index}>{content}</h4>;
  })}</div>;
}

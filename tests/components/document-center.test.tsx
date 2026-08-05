import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { documents } from "@/data/fixtures/public-content";
import { DocumentCenterPage } from "@/features/documents/components/document-center-page";
import { DocumentReader } from "@/features/documents/components/document-reader";

afterEach(cleanup);

const publishedDocuments = documents.filter((document) => document.published);

describe("DocumentCenterPage", () => {
  it("places pinned documents first and includes direct document URLs", () => {
    render(<DocumentCenterPage documents={publishedDocuments} locale="en" />);

    const documentLinks = screen.getAllByRole("link", { name: /Commission Terms|Revision Guide|Privacy Policy/ });
    expect(documentLinks[0]).toHaveAccessibleName("Commission Terms");
    expect(documentLinks[0]).toHaveAttribute("href", "/en/documents/commission-terms");
  });

  it("filters documents by category and page-scoped search", () => {
    render(<DocumentCenterPage documents={publishedDocuments} locale="en" />);

    fireEvent.click(screen.getByRole("button", { name: "Guides" }));
    expect(screen.getByText("Revision Guide")).toBeVisible();
    expect(screen.queryByText("Commission Terms")).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search documents" }), { target: { value: "clear" } });
    expect(screen.getByText("Revision Guide")).toBeVisible();
    expect(window.location.search).toBe("");
  });

  it("fully localizes document labels", () => {
    render(<DocumentCenterPage documents={publishedDocuments} locale="th" />);

    expect(screen.getByRole("heading", { name: "ศูนย์เอกสาร" })).toBeVisible();
    expect(screen.getByRole("searchbox", { name: "ค้นหาเอกสาร" })).toBeVisible();
    expect(screen.getByRole("button", { name: "ทั้งหมด" })).toBeVisible();
  });
});

describe("DocumentReader", () => {
  it("opens a readable dialog and closes it without changing request state", () => {
    const onClose = vi.fn();
    const fixtureDocument = publishedDocuments[0];
    render(<DocumentReader document={fixtureDocument} mode="dialog" onClose={onClose} />);

    expect(screen.getByRole("dialog", { name: "Commission Terms" })).toHaveTextContent(fixtureDocument.content.en);
    fireEvent.click(screen.getByRole("button", { name: "Close document" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("returns to the document center from a direct route", () => {
    render(<DocumentReader document={publishedDocuments[0]} mode="route" />);

    expect(screen.getByRole("link", { name: "Back to documents" })).toHaveAttribute("href", "/en/documents");
  });

  it("traps focus in the dialog and returns it to the opener", () => {
    const fixtureDocument = publishedDocuments[0];
    function Harness() {
      const [open, setOpen] = useState(false);
      return <><button onClick={() => setOpen(true)} type="button">Read terms</button>{open ? <DocumentReader document={fixtureDocument} mode="dialog" onClose={() => setOpen(false)} /> : null}</>;
    }

    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Read terms" });
    opener.focus();
    fireEvent.click(opener);
    const close = screen.getByRole("button", { name: "Close document" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(opener).toHaveFocus();
  });
});

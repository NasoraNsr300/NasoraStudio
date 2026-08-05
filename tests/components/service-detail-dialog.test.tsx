import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { serviceTypes } from "@/data/fixtures/public-content";
import { ServiceDetailDialog } from "@/features/commission/components/service-detail-dialog";

afterEach(cleanup);

describe("ServiceDetailDialog", () => {
  it("presents guidance for personal and commercial usage, rush, additions, timing, revisions, documents, samples, and final pricing", () => {
    const service = serviceTypes.find((candidate) => candidate.slug === "illustration-halfbody");
    if (!service) throw new Error("Expected illustration fixture service");

    render(<ServiceDetailDialog onClose={() => undefined} open service={service} />);

    const dialog = screen.getByRole("dialog", { name: "Illustration Half Body" });
    expect(dialog).toHaveTextContent("Personal");
    expect(dialog).toHaveTextContent("Commercial");
    expect(dialog).toHaveTextContent("Rush");
    expect(dialog).toHaveTextContent("Full background");
    expect(dialog).toHaveTextContent("About 2–3 weeks");
    expect(dialog).toHaveTextContent("4 standard revisions");
    expect(screen.getByRole("link", { name: "Commission Terms" })).toHaveAttribute("href", "/en/documents/commission-terms");
    expect(screen.getByRole("img", { name: service.examples[0].media.alt.en })).toBeVisible();
    expect(dialog).toHaveTextContent("Final pricing is confirmed after reviewing your brief.");
  });

  it("opens a non-submitting Stage 1 request preview and closes from its close control", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const service = serviceTypes.find((candidate) => candidate.slug === "illustration-halfbody");
    if (!service) throw new Error("Expected illustration fixture service");

    render(<ServiceDetailDialog onClose={onClose} open service={service} />);

    await user.click(screen.getByRole("button", { name: "Request estimate" }));
    expect(screen.getByRole("dialog", { name: "Request preview" })).toHaveTextContent("The interactive estimate form arrives in Stage 2.");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close request preview" }));
    await user.click(screen.getByRole("button", { name: "Close service details" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not render when closed", () => {
    render(<ServiceDetailDialog onClose={() => undefined} open={false} service={serviceTypes[0]} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("fully localizes headings, guidance, actions, and preview copy for Thai visitors", async () => {
    const user = userEvent.setup();
    const service = serviceTypes.find((candidate) => candidate.slug === "illustration-halfbody");
    if (!service) throw new Error("Expected illustration fixture service");

    render(<ServiceDetailDialog locale="th" onClose={() => undefined} open service={service} />);

    const dialog = screen.getByRole("dialog", { name: service.name.th });
    expect(dialog).toHaveTextContent("ราคาอ้างอิง");
    expect(dialog).toHaveTextContent("รายการเพิ่มเติม");
    expect(dialog).toHaveTextContent("ระยะเวลาทำงาน");
    expect(dialog).toHaveTextContent("แก้ไขมาตรฐาน 4 ครั้ง");
    expect(screen.getByRole("button", { name: "ขอประเมินราคา" })).toBeVisible();
    expect(screen.queryByText("Reference pricing")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ขอประเมินราคา" }));
    expect(screen.getByRole("dialog", { name: "ตัวอย่างการขอประเมินราคา" })).toHaveTextContent("Stage 2");
  });

  it("hides the detail dialog from assistive technology until the request preview closes", async () => {
    const user = userEvent.setup();
    const service = serviceTypes.find((candidate) => candidate.slug === "illustration-halfbody");
    if (!service) throw new Error("Expected illustration fixture service");

    render(<ServiceDetailDialog onClose={() => undefined} open service={service} />);

    await user.click(screen.getByRole("button", { name: "Request estimate" }));
    const detail = screen.getAllByRole("dialog", { hidden: true }).find((dialog) => dialog.getAttribute("aria-label") === service.name.en);
    if (!detail) throw new Error("Expected hidden detail dialog");
    expect(detail).toHaveAttribute("aria-hidden", "true");
    expect(detail).toHaveAttribute("inert");
    expect(screen.queryByRole("dialog", { name: service.name.en })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close request preview" }));
    expect(detail).not.toHaveAttribute("aria-hidden");
    expect(detail).not.toHaveAttribute("inert");
    expect(screen.getByRole("dialog", { name: service.name.en })).toBeVisible();
    expect(screen.getByRole("button", { name: "Request estimate" })).toHaveFocus();
  });

  it("traps focus and restores the opener for detail and request-preview dialogs", async () => {
    const user = userEvent.setup();
    const service = serviceTypes.find((candidate) => candidate.slug === "illustration-halfbody");
    if (!service) throw new Error("Expected illustration fixture service");
    const illustrationService = service;

    function Harness() {
      const [open, setOpen] = useState(false);
      return <><button onClick={() => setOpen(true)} type="button">Open details</button><ServiceDetailDialog onClose={() => setOpen(false)} open={open} service={illustrationService} /></>;
    }

    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open details" });
    await user.click(opener);

    const detailClose = screen.getByRole("button", { name: "Close service details" });
    expect(detailClose).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(detailClose).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Request estimate" }));
    const preview = screen.getByRole("dialog", { name: "Request preview" });
    const previewClose = screen.getByRole("button", { name: "Close request preview" });
    expect(previewClose).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(previewClose).toHaveFocus();
    fireEvent.click(preview);
    expect(screen.queryByRole("dialog", { name: "Request preview" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request estimate" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Request estimate" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Request preview" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request estimate" })).toHaveFocus();

    fireEvent.click(screen.getByRole("dialog", { name: service.name.en }));
    expect(screen.queryByRole("dialog", { name: service.name.en })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});

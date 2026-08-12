import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
    expect(dialog).toHaveTextContent("Standard revisions");
    expect(dialog).toHaveTextContent("4 rounds");
    expect(screen.getByRole("link", { name: "Commission Terms" })).toHaveAttribute("href", "/en/documents/commission-terms");
    expect(screen.getAllByRole("img", { name: service.examples[0].media.alt.en })[0]).toBeVisible();
    expect(dialog).toHaveTextContent("The final price is assessed once the project details have been reviewed.");
  });

  it("opens the estimate request form and closes from its close control", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const service = serviceTypes.find((candidate) => candidate.slug === "illustration-halfbody");
    if (!service) throw new Error("Expected illustration fixture service");

    render(<ServiceDetailDialog onClose={onClose} open service={service} />);

    await user.click(screen.getByRole("button", { name: "Request Estimate" }));
    const request = screen.getByRole("dialog", { name: "Request an estimate" });
    expect(request).toHaveTextContent("This is an estimate request only.");
    expect(screen.getByRole("button", { name: "Review and submit" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Save draft" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Close details" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("opens the active example at full size and closes it from the backdrop", async () => {
    const user = userEvent.setup();
    const service = serviceTypes.find((candidate) => candidate.slug === "illustration-halfbody");
    if (!service) throw new Error("Expected illustration fixture service");

    render(<ServiceDetailDialog onClose={() => undefined} open service={service} />);

    await user.click(screen.getByRole("button", { name: "View sample image full size" }));
    const preview = screen.getByRole("dialog", { name: service.examples[0].media.alt.en });
    expect(within(preview).getByRole("img", { name: service.examples[0].media.alt.en })).toHaveAttribute("src", service.examples[0].media.detailSrc);
    fireEvent.click(preview);
    expect(screen.queryByRole("dialog", { name: service.examples[0].media.alt.en })).not.toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<ServiceDetailDialog onClose={() => undefined} open={false} service={serviceTypes[0]} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("fully localizes headings, guidance, actions, and estimate form for Thai visitors", async () => {
    const user = userEvent.setup();
    const service = serviceTypes.find((candidate) => candidate.slug === "illustration-halfbody");
    if (!service) throw new Error("Expected illustration fixture service");

    render(<ServiceDetailDialog locale="th" onClose={() => undefined} open service={service} />);

    const dialog = screen.getByRole("dialog", { name: service.name.th });
    expect(dialog).toHaveTextContent("ราคาอ้างอิง");
    expect(dialog).toHaveTextContent("ราคาเพิ่มเติม");
    expect(dialog).toHaveTextContent("ระยะเวลาทำงาน");
    expect(dialog).toHaveTextContent("แก้ฟรีมาตรฐาน");
    expect(dialog).toHaveTextContent("4 ครั้ง");
    expect(screen.getByRole("button", { name: "ประเมินราคา" })).toBeVisible();
    expect(screen.queryByText("Reference pricing")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ประเมินราคา" }));
    expect(screen.getByRole("dialog", { name: "ส่งแบบประเมินราคา" })).toHaveTextContent("ข้อมูลผู้ว่าจ้าง");
    expect(screen.getByRole("button", { name: "ตรวจสอบและส่ง" })).toBeVisible();
  });

  it("hides the detail dialog from assistive technology until the estimate form closes", async () => {
    const user = userEvent.setup();
    const service = serviceTypes.find((candidate) => candidate.slug === "illustration-halfbody");
    if (!service) throw new Error("Expected illustration fixture service");

    render(<ServiceDetailDialog onClose={() => undefined} open service={service} />);

    await user.click(screen.getByRole("button", { name: "Request Estimate" }));
    const detail = screen.getAllByRole("dialog", { hidden: true }).find((dialog) => dialog.getAttribute("aria-labelledby") === `service-${service.slug}`);
    if (!detail) throw new Error("Expected hidden detail dialog");
    expect(detail).toHaveAttribute("aria-hidden", "true");
    expect(detail).toHaveAttribute("inert");
    expect(screen.queryByRole("dialog", { name: service.name.en })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(detail).not.toHaveAttribute("aria-hidden");
    expect(detail).not.toHaveAttribute("inert");
    expect(screen.getByRole("dialog", { name: service.name.en })).toBeVisible();
    expect(screen.getByRole("button", { name: "Request Estimate" })).toHaveFocus();
  });

  it("restores focus when detail and estimate dialogs close", async () => {
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

    const detailClose = screen.getByRole("button", { name: "Close details" });
    expect(detailClose).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(detailClose).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Request Estimate" }));
    const preview = screen.getByRole("dialog", { name: "Request an estimate" });
    const previewClose = screen.getByRole("button", { name: "Close" });
    expect(previewClose).toHaveFocus();
    fireEvent.click(preview);
    expect(screen.queryByRole("dialog", { name: "Request an estimate" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request Estimate" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Request Estimate" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Request an estimate" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request Estimate" })).toHaveFocus();

    fireEvent.click(screen.getByRole("dialog", { name: service.name.en }));
    expect(screen.queryByRole("dialog", { name: service.name.en })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});

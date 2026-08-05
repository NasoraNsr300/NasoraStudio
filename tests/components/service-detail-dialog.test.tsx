import { cleanup, render, screen } from "@testing-library/react";
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
    expect(screen.getByRole("status")).toHaveTextContent("The interactive estimate form arrives in Stage 2.");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close service details" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not render when closed", () => {
    render(<ServiceDetailDialog onClose={() => undefined} open={false} service={serviceTypes[0]} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

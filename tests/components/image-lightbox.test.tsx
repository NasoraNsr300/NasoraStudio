import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { portfolioItems } from "@/data/fixtures/public-content";
import { ImageLightbox } from "@/features/portfolio/components/image-lightbox";

afterEach(cleanup);

describe("ImageLightbox", () => {
  it("closes from its visible close control and restores focus to the opener", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(
      <>
        <button type="button">Open artwork</button>
      </>,
    );

    const opener = screen.getByRole("button", { name: "Open artwork" });
    opener.focus();
    rerender(
      <>
        <button type="button">Open artwork</button>
        <ImageLightbox item={portfolioItems[0]} locale="en" onClose={onClose} />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Close artwork" }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(opener).toHaveFocus();
  });

  it("closes on Escape and backdrop clicks while locking body scroll", () => {
    const onClose = vi.fn();
    render(<ImageLightbox item={portfolioItems[0]} locale="en" onClose={onClose} />);

    const dialog = screen.getByRole("dialog", { name: "Starlit Traveler" });
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();

    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("does not render when no item is selected", () => {
    render(<ImageLightbox item={null} locale="en" onClose={() => undefined} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a single controlled video asset when the selected media is video", () => {
    const item = portfolioItems.find((candidate) => candidate.media.kind === "video");
    if (!item) throw new Error("Expected a video fixture");

    render(<ImageLightbox item={item} locale="en" onClose={() => undefined} />);

    const dialog = screen.getByRole("dialog", { name: item.title.en });
    const video = dialog.querySelector("video");
    expect(video).toHaveAttribute("src", item.media.detailSrc);
    expect(video).toHaveAttribute("poster", item.media.posterSrc);
    expect(video).toHaveAttribute("preload", "none");
    expect(video).toHaveAttribute("controls");
    expect(dialog.querySelectorAll("img")).toHaveLength(0);
  });

  it("traps Tab and Shift+Tab focus inside the lightbox", () => {
    render(<ImageLightbox item={portfolioItems[0]} locale="en" onClose={() => undefined} />);

    const close = screen.getByRole("button", { name: "Close artwork" });
    close.focus();

    expect(fireEvent.keyDown(document, { key: "Tab" })).toBe(false);
    expect(close).toHaveFocus();
    expect(fireEvent.keyDown(document, { key: "Tab", shiftKey: true })).toBe(false);
    expect(close).toHaveFocus();
  });
});

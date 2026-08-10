import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ImageLightbox } from "@/features/portfolio/components/image-lightbox";
import { publicPortfolioItems } from "../fixtures/public-portfolio";

afterEach(cleanup);

describe("ImageLightbox", () => {
  it("closes from visible control and restores focus to opener", async () => {
    const user = userEvent.setup(); const onClose = vi.fn();
    const { rerender } = render(<button type="button">Open artwork</button>);
    const opener = screen.getByRole("button", { name: "Open artwork" }); opener.focus();
    rerender(<><button type="button">Open artwork</button><ImageLightbox item={publicPortfolioItems[0]} locale="en" onClose={onClose} /></>);
    await user.click(screen.getByRole("button", { name: "Close artwork" }));
    expect(onClose).toHaveBeenCalledOnce(); expect(opener).toHaveFocus();
  });

  it("closes on Escape and backdrop while locking body scroll", () => {
    const onClose = vi.fn(); render(<ImageLightbox item={publicPortfolioItems[0]} locale="en" onClose={onClose} />);
    const dialog = screen.getByRole("dialog", { name: "Moon Garden" });
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document, { key: "Escape" }); fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("renders one image and traps focus", () => {
    render(<ImageLightbox item={publicPortfolioItems[0]} locale="en" onClose={() => undefined} />);
    const dialog = screen.getByRole("dialog", { name: "Moon Garden" });
    expect(dialog.querySelectorAll("img")).toHaveLength(1);
    const close = screen.getByRole("button", { name: "Close artwork" }); close.focus();
    expect(fireEvent.keyDown(document, { key: "Tab" })).toBe(false); expect(close).toHaveFocus();
  });

  it("does not render without selected item", () => {
    render(<ImageLightbox item={null} locale="en" onClose={() => undefined} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

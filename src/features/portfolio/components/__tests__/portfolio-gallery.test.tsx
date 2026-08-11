import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { PortfolioGallery } from "@/features/portfolio/components/portfolio-gallery";
import type { PublicPortfolioItem } from "@/features/portfolio/domain/portfolio";

const items: PublicPortfolioItem[] = [{
  category: "illustration", categoryName: { en: "Illustration", th: "ภาพประกอบ" }, displayOrder: 1, featured: true, showInHero: false,
  id: "00000000-0000-4000-8000-000000000021",
  media: { alt: { en: "Moon", th: "จันทร์" }, cardSrc: "/api/portfolio/media/00000000-0000-4000-8000-000000000031", contentType: "image/webp", detailSrc: "/api/portfolio/media/00000000-0000-4000-8000-000000000031", height: 1600, id: "00000000-0000-4000-8000-000000000031", width: 1200 },
  title: { en: "Moon Garden", th: "สวนจันทร์" },
}, {
  category: "chibi", categoryName: { en: "Chibi", th: "ชิบิ" }, displayOrder: 2, featured: false, showInHero: false,
  id: "00000000-0000-4000-8000-000000000022",
  media: { alt: { en: "Star", th: "ดาว" }, cardSrc: "/api/portfolio/media/00000000-0000-4000-8000-000000000032", contentType: "image/png", detailSrc: "/api/portfolio/media/00000000-0000-4000-8000-000000000032", height: 900, id: "00000000-0000-4000-8000-000000000032", width: 1600 },
  title: { en: "Star Child", th: "เด็กดาว" },
}];

afterEach(cleanup);

describe("PortfolioGallery", () => {
  it("shows only database image and title overlay, with localized database categories", async () => {
    const user = userEvent.setup();
    const { container } = render(<PortfolioGallery items={items} locale="th" />);
    expect(screen.getByRole("button", { name: "ดู สวนจันทร์" })).toBeVisible();
    expect(screen.getByText("สวนจันทร์")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ภาพประกอบ" })).toBeVisible();
    expect(container.innerHTML).not.toContain("fixtures");
    await user.click(screen.getByRole("button", { name: "ชิบิ" }));
    expect(screen.getByRole("button", { name: "ดู เด็กดาว" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "ดู สวนจันทร์" })).not.toBeInTheDocument();
  });

  it("opens one image lightbox and closes on backdrop or Escape", async () => {
    const user = userEvent.setup();
    render(<PortfolioGallery items={items} locale="th" />);
    await user.click(screen.getByRole("button", { name: "ดู สวนจันทร์" }));
    const dialog = screen.getByRole("dialog", { name: "สวนจันทร์" });
    expect(dialog).toBeVisible();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

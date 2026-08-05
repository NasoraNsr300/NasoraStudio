import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResponsiveMedia } from "@/shared/components/media/responsive-media";

describe("ResponsiveMedia", () => {
  it("applies placement crop object position to its rendered image", () => {
    render(
      <ResponsiveMedia
        crop={{ aspectRatio: "4 / 5", objectPosition: "42% 18%" }}
        locale="en"
        media={{
          id: "media-1",
          kind: "image",
          alt: { th: "ภาพตัวอย่าง", en: "Artwork sample" },
          thumbnailSrc: "/fixtures/thumb.svg",
          cardSrc: "/fixtures/card.svg",
          detailSrc: "/fixtures/detail.svg",
          width: 1600,
          height: 1000,
        }}
        sizes="(min-width: 768px) 50vw, 100vw"
      />,
    );

    expect(screen.getByRole("img", { name: "Artwork sample" })).toHaveStyle({
      objectPosition: "42% 18%",
    });
  });
});

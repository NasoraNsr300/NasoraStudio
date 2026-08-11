import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { featuredItems, heroItems } from "@/data/fixtures/public-content";
import { HomePage } from "@/features/home/components/home-page";
import { HomeHero } from "@/features/home/components/home-hero";

afterEach(cleanup);

describe("HomePage", () => {
  it("renders the first Hero as the static fallback with a matching responsive preload", () => {
    const markup = renderToStaticMarkup(
      <HomeHero heroItems={heroItems} locale="en" randomValue={0.75} />,
    );
    const container = document.createElement("div");
    container.innerHTML = markup;
    const preload = container.querySelector('link[rel="preload"][as="image"]');

    expect(container).toHaveTextContent("Visual Designer & Illustrator Studio");
    expect(preload).toHaveAttribute(
      "imagesrcset",
      `${heroItems[0].media.thumbnailSrc} 480w, ${heroItems[0].media.cardSrc} 960w, ${heroItems[0].media.detailSrc} 1600w`,
    );
    expect(preload).toHaveAttribute("imagesizes", "(min-width: 900px) 52vw, 100vw");
  });

  it("keeps its selected Hero media stable across rerenders", () => {
    const { rerender } = render(
      <HomePage featuredItems={featuredItems} heroItems={heroItems} locale="en" randomValue={0.75} />,
    );

    expect(screen.getByRole("img", { name: "Character in amber light" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Visual Designer & Illustrator Studio" })).toBeVisible();

    rerender(<HomePage featuredItems={featuredItems} heroItems={heroItems} locale="en" randomValue={0} />);

    expect(screen.getByRole("img", { name: "Character in amber light" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Visual Designer & Illustrator Studio" })).toBeVisible();
  });

  it("changes only Hero media after client selection while fallback copy stays stable", () => {
    const staticMarkup = renderToStaticMarkup(
      <HomeHero heroItems={heroItems} locale="en" randomValue={0.75} />,
    );
    expect(staticMarkup).toContain('alt="Character under moonlight"');

    const { rerender } = render(
      <HomePage featuredItems={featuredItems} heroItems={heroItems} locale="en" randomValue={0.75} />,
    );

    expect(screen.getByRole("img", { name: "Character in amber light" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Visual Designer & Illustrator Studio" })).toBeVisible();

    rerender(<HomePage featuredItems={featuredItems} heroItems={heroItems} locale="en" randomValue={0} />);

    expect(screen.getByRole("img", { name: "Character in amber light" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Visual Designer & Illustrator Studio" })).toBeVisible();
  });

  it("keeps the static Hero frame dimensions after client selection", () => {
    const variedHeroItems = [
      heroItems[0],
      { ...heroItems[1], crop: { ...heroItems[1].crop, aspectRatio: "4 / 5" } },
    ];

    render(<HomePage featuredItems={featuredItems} heroItems={variedHeroItems} locale="en" randomValue={0.75} />);

    expect(screen.getByRole("img", { name: "Character in amber light" }).parentElement).toHaveStyle({
      "--hero-aspect-ratio": "16 / 9",
    });
  });

  it("contains Home-only Quick Info tabs", () => {
    render(<HomePage featuredItems={featuredItems} heroItems={heroItems} locale="en" randomValue={0} />);

    expect(screen.getByRole("tab", { name: "About" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Queue" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Terms" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Contact" })).toBeVisible();
  });

  it("shows the approved compact studio facts in the About panel", () => {
    render(<HomePage featuredItems={featuredItems} heroItems={heroItems} locale="th" randomValue={0} />);

    expect(screen.getByText("11:00 – 22:00")).toBeVisible();
    expect(screen.getByText("ใส่ใจทุกรายละเอียด")).toBeVisible();
    expect(screen.getByText("สื่อสารชัดเจน ส่งงานตรงเวลา")).toBeVisible();
  });

  it("prefixes every featured work destination with the active locale", () => {
    render(<HomePage featuredItems={featuredItems} heroItems={heroItems} locale="th" randomValue={0} />);

    for (const link of screen.getAllByRole("link", { name: "ดู Starlit Traveler" })) {
      expect(link).toHaveAttribute("href", "/th/portfolio?work=starlit-traveler");
    }
  });

  it("localizes Thai-visible hero and carousel controls including accessible labels", () => {
    render(<HomePage featuredItems={featuredItems} heroItems={heroItems} locale="th" randomValue={0} />);

    expect(screen.getByRole("link", { name: "ดูบริการคอมมิชชัน" })).toBeVisible();
    expect(screen.getByRole("region", { name: "ผลงานแนะนำ" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "หยุดผลงานเด่น" })).not.toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "ข้อมูลฉบับย่อ" })).toBeVisible();
  });

  it("keeps the approved Home frame when live Hero and featured content are empty", () => {
    render(<HomePage
      featuredItems={[]}
      heroItems={[]}
      locale="th"
      settings={{
        businessHours: "11:00 – 22:00",
        commissionsOpen: true,
        discordContact: "nasora.studio",
        homeDescription: { en: "Stories", th: "เรื่องราว" },
        homeHeading: { en: "Draw your world", th: "รับวาดภาพในโลกของคุณ" },
        particlesEnabled: true,
        queueCapacity: 10,
        shootingStarsEnabled: true,
      }}
    />);

    expect(screen.getByRole("heading", { name: "รับวาดภาพในโลกของคุณ" })).toBeVisible();
    expect(screen.getByText("เรื่องราว")).toBeVisible();
    expect(screen.getByText("ยังไม่มีผลงานแนะนำ")).toBeVisible();
  });
});

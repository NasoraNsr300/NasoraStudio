import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { featuredItems, heroItems } from "@/data/fixtures/public-content";
import { HomePage } from "@/features/home/components/home-page";

afterEach(cleanup);

describe("HomePage", () => {
  it("keeps its selected hero stable across rerenders", () => {
    const { rerender } = render(
      <HomePage featuredItems={featuredItems} heroItems={heroItems} locale="en" randomValue={0.75} />,
    );

    expect(screen.getByRole("heading", { name: "Welcome to Nasora's universe" })).toBeVisible();

    rerender(<HomePage featuredItems={featuredItems} heroItems={heroItems} locale="en" randomValue={0} />);

    expect(screen.getByRole("heading", { name: "Welcome to Nasora's universe" })).toBeVisible();
  });

  it("contains Home-only Quick Info tabs", () => {
    render(<HomePage featuredItems={featuredItems} heroItems={heroItems} locale="en" randomValue={0} />);

    expect(screen.getByRole("tab", { name: "About" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Queue" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Terms" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Contact" })).toBeVisible();
  });
});

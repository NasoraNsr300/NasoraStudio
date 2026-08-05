import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicShell } from "@/shared/components/public-shell/public-shell";

describe("PublicShell", () => {
  it("renders the shared public controls without a footer or navbar login", () => {
    render(
      <PublicShell
        locale="en"
        search={{ label: "Search artwork", action: "/en/portfolio", queryName: "q" }}
      >
        <main>Page content</main>
      </PublicShell>,
    );

    expect(screen.getByText("NASORA")).toBeVisible();
    expect(screen.getByRole("button", { name: "Open menu" })).toBeVisible();
    expect(screen.getByRole("search", { name: "Search artwork" })).toHaveAttribute(
      "action",
      "/en/portfolio",
    );
    expect(screen.getByText("OPEN")).toBeVisible();
    expect(within(screen.getByRole("banner")).getByText("Queue")).toBeVisible();
    expect(screen.getByRole("link", { name: "TH" })).toBeVisible();
    expect(screen.getByRole("button", { name: /theme/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /account/i })).toBeVisible();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /log in/i })).not.toBeInTheDocument();
  });
});

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getDictionary } from "@/shared/i18n/dictionaries";

const navigation = vi.hoisted(() => ({ pathname: "/en", usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: navigation.usePathname }));

import { PublicShell } from "@/shared/components/public-shell/public-shell";

afterEach(cleanup);

describe("PublicShell", () => {
  it("renders the shared public controls without a footer or navbar login", () => {
    navigation.pathname = "/en";
    navigation.usePathname.mockImplementation(() => navigation.pathname);
    render(<PublicShell locale="en"><main>Page content</main></PublicShell>);

    expect(screen.getByText("NASORA")).toBeVisible();
    expect(screen.getByRole("button", { name: "Open menu" })).toBeVisible();
    expect(screen.getByRole("search", { name: "Search Nasora" })).toHaveAttribute("action", "/en");
    expect(screen.getByText("OPEN")).toBeVisible();
    expect(within(screen.getByRole("banner")).getByText("Queue")).toBeVisible();
    expect(screen.getByRole("link", { name: "TH" })).toBeVisible();
    expect(screen.getByRole("button", { name: /theme/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /account/i })).toBeVisible();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /log in/i })).not.toBeInTheDocument();
  });
});

describe("PublicShell sidebar", () => {
  it("localizes Thai navigation and opens the shared authentication preview", async () => {
    const user = userEvent.setup();
    const th = getDictionary("th");
    navigation.pathname = "/th";
    navigation.usePathname.mockImplementation(() => navigation.pathname);
    render(<PublicShell locale="th"><main>Page content</main></PublicShell>);

    await user.click(screen.getByRole("button", { name: th.menu }));
    expect(screen.getByRole("link", { name: th.home })).toBeVisible();
    expect(screen.getByRole("link", { name: th.portfolio })).toBeVisible();
    expect(screen.getByRole("link", { name: th.commission })).toBeVisible();
    await user.click(screen.getByRole("button", { name: th.login }));
    expect(screen.getByRole("region", { name: "Authentication preview" })).toBeVisible();
  });
});

describe("Floating navbar search scope", () => {
  it.each([
    ["/en", "/en", "Search Nasora"],
    ["/en/portfolio", "/en/portfolio", "Search portfolio"],
    ["/en/commission", "/en/commission", "Search commissions"],
    ["/en/queue", "/en/queue", "Search queue"],
    ["/en/documents", "/en/documents", "Search documents"],
  ])("uses the active path for %s", (pathname, action, label) => {
    navigation.pathname = pathname;
    navigation.usePathname.mockImplementation(() => navigation.pathname);
    render(<PublicShell locale="en">Page content</PublicShell>);

    expect(screen.getByRole("search", { name: label })).toHaveAttribute("action", action);
    expect(within(screen.getByRole("search", { name: label })).getByRole("searchbox")).toHaveAttribute("placeholder", label);
  });

  it("localizes the active document scope", () => {
    const th = getDictionary("th");
    const label = `${th.search}${th.documents}`;
    navigation.pathname = "/th/documents";
    navigation.usePathname.mockImplementation(() => navigation.pathname);
    render(<PublicShell locale="th">Page content</PublicShell>);

    expect(screen.getByRole("search", { name: label })).toHaveAttribute("action", "/th/documents");
    expect(within(screen.getByRole("search", { name: label })).getByRole("searchbox")).toHaveAttribute("placeholder", label);
  });
});

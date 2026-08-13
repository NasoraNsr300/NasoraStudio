import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getDictionary } from "@/shared/i18n/dictionaries";
import type { AuthClientLike } from "@/shared/auth/auth-session-provider";

const navigation = vi.hoisted(() => ({
  params: new URLSearchParams(),
  pathname: "/en",
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: navigation.usePathname,
  useSearchParams: navigation.useSearchParams,
}));

import { PublicShell } from "@/shared/components/public-shell/public-shell";

function createAuthClient(signedIn = false): AuthClientLike {
  const user = signedIn ? { email: "stardust@example.com", id: "member-1", user_metadata: { nickname: "Stardust" } } : null;
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  };
}

afterEach(cleanup);

navigation.useSearchParams.mockImplementation(() => navigation.params);

describe("PublicShell", () => {
  it("renders the persisted closed commission availability", () => {
    navigation.pathname = "/th";
    navigation.usePathname.mockImplementation(() => navigation.pathname);
    render(<PublicShell authClient={createAuthClient()} locale="th" settings={{
      businessHours: "11:00 – 22:00",
      commissionsOpen: false,
      discordContact: "nasora.studio",
      homeDescription: { en: "Stories", th: "เรื่องราว" },
      homeHeading: { en: "Draw your world", th: "รับวาดภาพในโลกของคุณ" },
      particlesEnabled: false,
      queueCapacity: 10,
      shootingStarsEnabled: false,
    }}><main>Page content</main></PublicShell>);

    expect(screen.getByText("CLOSED")).toBeVisible();
  });

  it("renders the shared public controls without a footer or navbar login", () => {
    navigation.pathname = "/en";
    navigation.usePathname.mockImplementation(() => navigation.pathname);
    render(<PublicShell authClient={createAuthClient()} locale="en"><main>Page content</main></PublicShell>);

    expect(screen.getByText("NASORA")).toBeVisible();
    expect(screen.getByRole("button", { name: "Open menu" })).toBeVisible();
    expect(screen.getByRole("search", { name: "Search portfolio" })).toHaveAttribute("action", "/en/portfolio");
    expect(screen.getByText("OPEN")).toBeVisible();
    expect(within(screen.getByRole("banner")).getByText("Queue")).toBeVisible();
    expect(screen.getByRole("link", { name: "TH" })).toBeVisible();
    expect(screen.getByRole("link", { name: "TH" }).className).toContain("languageLink");
    expect(screen.getByRole("button", { name: "Night" })).toBeVisible();
    expect(screen.getByRole("button", { name: /account/i })).toBeVisible();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /log in/i })).not.toBeInTheDocument();
  });

  it("opens the sign-in dialog for a signed-out account", async () => {
    const user = userEvent.setup();
    navigation.pathname = "/en";
    navigation.usePathname.mockImplementation(() => navigation.pathname);
    render(<PublicShell authClient={createAuthClient()} locale="en"><main>Page content</main></PublicShell>);

    await waitFor(() => expect(screen.getByRole("button", { name: "Account" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "Account" }));
    expect(screen.getByRole("dialog", { name: "Sign in to Nasora" })).toBeVisible();
  });

  it("keeps authentication available while the initial session check is pending", async () => {
    const user = userEvent.setup();
    const client = createAuthClient();
    client.auth.getUser = vi.fn(
      () =>
        new Promise<{ data: { user: null }; error?: unknown }>(() => undefined),
    );
    navigation.pathname = "/en";
    navigation.usePathname.mockImplementation(() => navigation.pathname);
    render(<PublicShell authClient={client} locale="en"><main>Page content</main></PublicShell>);

    const account = screen.getByRole("button", { name: "Account" });
    expect(account).toBeEnabled();
    await user.click(account);
    expect(screen.getByRole("dialog", { name: "Sign in to Nasora" })).toBeVisible();
  });

  it("opens authentication automatically after a protected member redirect", async () => {
    window.history.pushState({}, "", "/th?auth=1&next=%2Fth%2Fmember%2Fprofile");
    navigation.pathname = "/th";
    navigation.usePathname.mockImplementation(() => navigation.pathname);
    render(<PublicShell authClient={createAuthClient()} locale="th"><main>Page content</main></PublicShell>);

    expect(await screen.findByRole("dialog", { name: "เข้าสู่ระบบ Nasora" })).toBeVisible();
    window.history.pushState({}, "", "/");
  });

  it("opens the signed-in account menu and notification panel", async () => {
    const user = userEvent.setup();
    navigation.pathname = "/en";
    navigation.usePathname.mockImplementation(() => navigation.pathname);
    render(<PublicShell authClient={createAuthClient(true)} locale="en"><main>Page content</main></PublicShell>);

    await waitFor(() => expect(screen.getByRole("button", { name: "Account" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "Account" }));
    expect(screen.getByRole("link", { name: "Member area" })).toHaveAttribute("href", "/en/member/requests");
    await user.click(screen.getByRole("button", { name: /Notifications/ }));
    expect(screen.getByRole("heading", { name: "Notifications" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Back to account menu" })).toBeVisible();
  });
});

describe("PublicShell sidebar", () => {
  it("hides the login action after the shared session signs in", async () => {
    const user = userEvent.setup();
    navigation.pathname = "/th";
    navigation.usePathname.mockImplementation(() => navigation.pathname);
    render(<PublicShell authClient={createAuthClient(true)} locale="th"><main>Page content</main></PublicShell>);

    await waitFor(() => expect(screen.getByRole("button", { name: getDictionary("th").account })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: getDictionary("th").menu }));
    expect(screen.queryByRole("button", { name: getDictionary("th").login })).not.toBeInTheDocument();
  });

  it("localizes Thai navigation and opens the real authentication dialog", async () => {
    const user = userEvent.setup();
    const th = getDictionary("th");
    navigation.pathname = "/th";
    navigation.usePathname.mockImplementation(() => navigation.pathname);
    render(<PublicShell authClient={createAuthClient()} locale="th"><main>Page content</main></PublicShell>);

    await user.click(screen.getByRole("button", { name: th.menu }));
    expect(screen.getByRole("link", { name: th.home })).toBeVisible();
    expect(screen.getByRole("link", { name: th.portfolio })).toBeVisible();
    expect(screen.getByRole("link", { name: th.commissionNav })).toBeVisible();
    await user.click(screen.getByRole("button", { name: th.login }));
    const dialog = screen.getByRole("dialog", { name: "เข้าสู่ระบบ Nasora" });
    expect(dialog).toBeVisible();
    const closeDialog = screen.getByRole("button", { name: "ปิดหน้าเข้าสู่ระบบ" });
    expect(closeDialog).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(dialog).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: th.login })).toHaveFocus();
  });

  it.each([
    ["/en", "Home"],
    ["/en/commission/illustration", "Commission"],
    ["/en/documents/commission-terms", "Documents"],
  ])("marks the best matching route for %s", async (pathname, activeLabel) => {
    const user = userEvent.setup();
    navigation.pathname = pathname;
    navigation.usePathname.mockImplementation(() => navigation.pathname);
    render(<PublicShell authClient={createAuthClient()} locale="en">Page content</PublicShell>);

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("link", { name: activeLabel })).toHaveAttribute("aria-current", "page");
    for (const link of screen.getByRole("complementary", { name: "Site navigation" }).querySelectorAll("a")) {
      if (link.textContent !== activeLabel) expect(link).not.toHaveAttribute("aria-current");
    }
  });
});

describe("Floating navbar size", () => {
  it("keeps one navbar state after scrolling", () => {
    navigation.pathname = "/en";
    navigation.usePathname.mockImplementation(() => navigation.pathname);
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0, writable: true });
    render(<PublicShell authClient={createAuthClient()} locale="en">Page content</PublicShell>);

    const navbar = screen.getByRole("banner");
    expect(navbar).not.toHaveAttribute("data-compact");
    window.scrollY = 80;
    fireEvent.scroll(window);
    expect(navbar).not.toHaveAttribute("data-compact");
  });
});

describe("Floating navbar search scope", () => {
  it.each([
    ["/en", "/en/portfolio", "Search portfolio"],
    ["/en/portfolio", "/en/portfolio", "Search portfolio"],
    ["/en/commission", "/en/commission", "Search commissions"],
    ["/en/queue", "/en/queue", "Search queue"],
    ["/en/documents", "/en/documents", "Search documents"],
  ])("uses the active path for %s", (pathname, action, label) => {
    navigation.pathname = pathname;
    navigation.usePathname.mockImplementation(() => navigation.pathname);
    render(<PublicShell authClient={createAuthClient()} locale="en">Page content</PublicShell>);

    expect(screen.getByRole("search", { name: label })).toHaveAttribute("action", action);
    expect(within(screen.getByRole("search", { name: label })).getByRole("searchbox")).toHaveAttribute("placeholder", label);
  });

  it("localizes the active document scope", () => {
    const th = getDictionary("th");
    const label = `${th.search}${th.documents}`;
    navigation.pathname = "/th/documents";
    navigation.usePathname.mockImplementation(() => navigation.pathname);
    render(<PublicShell authClient={createAuthClient()} locale="th">Page content</PublicShell>);

    expect(screen.getByRole("search", { name: label })).toHaveAttribute("action", "/th/documents");
    expect(within(screen.getByRole("search", { name: label })).getByRole("searchbox")).toHaveAttribute("placeholder", label);
  });
});

describe("Language switch route preservation", () => {
  it.each([
    ["/th", "EN", "/en"],
    ["/th/commission", "EN", "/en/commission"],
    ["/th/portfolio", "EN", "/en/portfolio"],
    ["/th/queue", "EN", "/en/queue"],
    ["/th/member/profile", "EN", "/en/member/profile"],
    ["/en/documents", "TH", "/th/documents"],
  ])("preserves active pathname %s when switching language to %s", (pathname, linkText, expectedHref) => {
    navigation.pathname = pathname;
    navigation.usePathname.mockImplementation(() => navigation.pathname);
    const locale = pathname.startsWith("/th") ? "th" : "en";
    render(<PublicShell authClient={createAuthClient()} locale={locale}>Page content</PublicShell>);

    expect(screen.getByRole("link", { name: linkText })).toHaveAttribute("href", expectedHref);
  });

  it("preserves active search parameters when switching language", () => {
    navigation.pathname = "/th/commission";
    navigation.params = new URLSearchParams("q=chibi&view=list");
    navigation.usePathname.mockImplementation(() => navigation.pathname);
    navigation.useSearchParams.mockImplementation(() => navigation.params);

    render(<PublicShell authClient={createAuthClient()} locale="th">Page content</PublicShell>);

    expect(screen.getByRole("link", { name: "EN" })).toHaveAttribute(
      "href",
      "/en/commission?q=chibi&view=list",
    );
    navigation.params = new URLSearchParams();
  });
});

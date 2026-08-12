import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/admin", push: vi.fn(), usePathname: vi.fn(), useRouter: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: navigation.usePathname, useRouter: navigation.useRouter }));
vi.mock("@/shared/supabase/client", () => ({ createSupabaseBrowserClient: () => ({ auth: { signOut: vi.fn().mockResolvedValue({ error: null }) } }) }));

import { AdminShell } from "@/features/admin/components/admin-shell";

const shellData = { adminEmail: "nasora.nsr300@gmail.com", adminImageUrl: null, notifications: [], unreadMessages: 0 };

beforeEach(() => {
  navigation.pathname = "/admin";
  navigation.usePathname.mockImplementation(() => navigation.pathname);
  navigation.useRouter.mockReturnValue({ push: navigation.push, refresh: vi.fn() });
  window.localStorage.clear();
  document.documentElement.dataset.theme = "night";
});
afterEach(cleanup);

describe("AdminShell", () => {
  it("links every admin destination and marks the active page", () => {
    navigation.pathname = "/admin/payments";
    render(<AdminShell data={shellData}><h1>การชำระเงิน</h1></AdminShell>);
    expect(screen.getByRole("link", { name: "การชำระเงิน" })).toHaveAttribute("href", "/admin/payments");
    expect(screen.getByRole("link", { name: "การชำระเงิน" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "ตั้งค่า" })).toHaveAttribute("href", "/admin/settings");
  });

  it("controls and remembers the admin theme", async () => {
    const user = userEvent.setup();
    render(<AdminShell data={shellData}><h1>Dashboard</h1></AdminShell>);
    await user.click(screen.getByRole("button", { name: "Autumn" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "autumn");
    expect(window.localStorage.getItem("nasora-theme")).toBe("autumn");
  });

  it("renders the persisted commission availability", () => {
    render(<AdminShell data={shellData} initialCommissionsOpen={false}><h1>Dashboard</h1></AdminShell>);
    expect(screen.getByRole("switch", { name: "สถานะเปิดรับงาน" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("ปิดรับงาน")).toBeVisible();
  });

  it("collapses the sidebar and never shows the old mock notification 5", async () => {
    const user = userEvent.setup();
    render(<AdminShell data={shellData}><h1>Dashboard</h1></AdminShell>);
    expect(screen.queryByText("5")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "ซ่อนเมนู" }));
    expect(window.localStorage.getItem("nasora-admin-sidebar-collapsed")).toBe("true");
  });
});

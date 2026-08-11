import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/admin", usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: navigation.usePathname }));

import { AdminShell } from "@/features/admin/components/admin-shell";

beforeEach(() => {
  navigation.pathname = "/admin";
  navigation.usePathname.mockImplementation(() => navigation.pathname);
  window.localStorage.clear();
  document.documentElement.dataset.theme = "night";
});
afterEach(cleanup);

describe("AdminShell", () => {
  it("links every admin destination and marks the active page", () => {
    navigation.pathname = "/admin/payments";
    render(<AdminShell><h1>การชำระเงิน</h1></AdminShell>);

    expect(screen.getByRole("link", { name: "การชำระเงิน" })).toHaveAttribute("href", "/admin/payments");
    expect(screen.getByRole("link", { name: "การชำระเงิน" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "ตั้งค่า" })).toHaveAttribute("href", "/admin/settings");
  });

  it("controls and remembers the admin theme", async () => {
    const user = userEvent.setup();
    render(<AdminShell><h1>Dashboard</h1></AdminShell>);

    await user.click(screen.getByRole("button", { name: "Autumn" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "autumn");
    expect(window.localStorage.getItem("nasora-theme")).toBe("autumn");
  });

  it("renders the persisted commission availability", () => {
    render(<AdminShell initialCommissionsOpen={false}><h1>Dashboard</h1></AdminShell>);

    expect(screen.getByRole("switch", { name: "สถานะเปิดรับงาน" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("ปิดรับงาน")).toBeVisible();
  });
});

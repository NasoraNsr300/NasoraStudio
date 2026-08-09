import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AccountMenu } from "@/shared/components/public-shell/account-menu";

afterEach(cleanup);

const handlers = {
  onClose: vi.fn(),
  onShowNotifications: vi.fn(),
  onSignOut: vi.fn(),
};

describe("AccountMenu admin entry", () => {
  it("shows the admin area without replacing the member area for the sole admin", () => {
    render(<AccountMenu {...handlers} isAdmin locale="th" nickname="Nasora" />);

    expect(screen.getByRole("link", { name: "พื้นที่สมาชิก" })).toHaveAttribute("href", "/th/member/requests");
    expect(screen.getByRole("link", { name: "พื้นที่แอดมิน" })).toHaveAttribute("href", "/admin");
  });

  it("does not expose the admin area to an ordinary member", () => {
    render(<AccountMenu {...handlers} isAdmin={false} locale="en" nickname="Stardust" />);

    expect(screen.getByRole("link", { name: "Member area" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Admin area" })).not.toBeInTheDocument();
  });
});

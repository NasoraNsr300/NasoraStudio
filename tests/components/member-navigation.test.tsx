import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MemberTabs } from "@/features/member/components/member-tabs";

afterEach(cleanup);

describe("MemberTabs", () => {
  it("renders direct member links and marks the current tab", () => {
    render(<MemberTabs active="messages" locale="en" />);

    expect(screen.getByRole("link", { name: "Requests" })).toHaveAttribute("href", "/en/member/requests");
    expect(screen.getByRole("link", { name: /Messages/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Payments" })).toHaveAttribute("href", "/en/member/payments");
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/en/member/profile");
  });

  it("renders localized Thai labels and an accessible unread count", () => {
    render(<MemberTabs active="requests" locale="th" />);

    expect(screen.getByRole("navigation", { name: "เมนูพื้นที่สมาชิก" })).toBeVisible();
    expect(screen.getByRole("link", { name: "แบบประเมิน" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByLabelText("3 ข้อความที่ยังไม่ได้อ่าน")).toBeVisible();
  });
});

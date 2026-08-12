import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  pathname: "/admin/estimates",
  push: vi.fn(),
  back: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ back: navigation.back, push: navigation.push }),
  useSearchParams: () => navigation.searchParams,
}));

import {
  AdminEstimatesPage,
  AdminJobsPage,
} from "@/features/admin/components/admin-section-pages";

afterEach(cleanup);

const pages = [
  [AdminEstimatesPage, "แบบประเมิน"],
  [AdminJobsPage, "งานและคิว"],
] as const;

describe("admin management pages", () => {
  it.each(pages)("renders %s from live data", (Page, heading) => {
    render(<Page />);
    expect(screen.getByRole("heading", { name: heading })).toBeVisible();
  });

  it("opens the Guest job form as a modal", async () => {
    const user = userEvent.setup();
    render(<AdminJobsPage />);
    await user.click(screen.getByRole("button", { name: "เพิ่มคิว Guest" }));
    expect(screen.getByRole("dialog", { name: "เพิ่มงาน Guest" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "ชื่อลูกค้า" })).toBeVisible();
  });
});

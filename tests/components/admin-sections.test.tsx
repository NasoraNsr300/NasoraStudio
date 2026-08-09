import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  pathname: "/admin/estimates",
  push: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => navigation.searchParams,
}));

import {
  AdminCatalogPage,
  AdminDocumentsPage,
  AdminEstimatesPage,
  AdminJobsPage,
  AdminMessagesPage,
  AdminPaymentsPage,
  AdminPortfolioPage,
  AdminSettingsPage,
} from "@/features/admin/components/admin-section-pages";

afterEach(cleanup);

const pages = [
  [AdminEstimatesPage, "แบบประเมิน", "สร้างใบเสนอราคา"],
  [AdminJobsPage, "งานและคิว", "เพิ่มคิว Guest"],
  [AdminPaymentsPage, "การชำระเงิน", "เพิ่มรายการชำระเงิน"],
  [AdminMessagesPage, "ข้อความ", "ข้อความใหม่"],
  [AdminCatalogPage, "อัลบั้มและราคา", "เพิ่มอัลบั้ม"],
  [AdminPortfolioPage, "ผลงาน", "เพิ่มผลงาน"],
  [AdminDocumentsPage, "เอกสาร", "สร้างเอกสาร"],
  [AdminSettingsPage, "ตั้งค่า", "บันทึกการตั้งค่า"],
] as const;

describe("admin management pages", () => {
  it.each(pages)("renders %s with its primary action", (Page, heading, action) => {
    render(<Page />);
    expect(screen.getByRole("heading", { name: heading })).toBeVisible();
    expect(screen.getByRole("button", { name: action })).toBeVisible();
  });
});

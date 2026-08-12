import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ back: vi.fn(), useRouter: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: navigation.useRouter }));

import { AdminModalShell } from "@/features/admin/modal/admin-modal-shell";

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  navigation.useRouter.mockReturnValue({ back: navigation.back });
});

describe("AdminModalShell", () => {
  it("closes a clean modal with Escape", async () => {
    render(<AdminModalShell mode="center" title="เพิ่มรายการ"><button type="button">ทำงาน</button></AdminModalShell>);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(navigation.back).toHaveBeenCalledOnce();
  });

  it("warns before closing a dirty modal and only leaves after confirmation", async () => {
    const user = userEvent.setup();
    render(<AdminModalShell mode="fullscreen" title="เพิ่มผลงาน"><label>ชื่อ<input /></label></AdminModalShell>);

    await user.type(screen.getByRole("textbox", { name: "ชื่อ" }), "งานใหม่");
    await user.click(screen.getByRole("button", { name: "ปิดหน้าต่าง" }));

    expect(screen.getByRole("alertdialog", { name: "ออกโดยไม่บันทึก?" })).toBeInTheDocument();
    expect(navigation.back).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "ออกโดยไม่บันทึก" }));
    expect(navigation.back).toHaveBeenCalledOnce();
  });

  it("closes through an explicit inline callback", async () => {
    const user = userEvent.setup();
    const close = vi.fn();
    render(<AdminModalShell mode="center" onClose={close} title="เพิ่มคิว Guest"><p>ฟอร์ม</p></AdminModalShell>);
    await user.click(screen.getByRole("button", { name: "ปิดหน้าต่าง" }));
    expect(close).toHaveBeenCalledOnce();
    expect(navigation.back).not.toHaveBeenCalled();
  });
});

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MemberContactList } from "@/features/member/components/member-contact-list";
import { MemberPasswordForm } from "@/features/member/components/member-password-form";
import { MemberProfileForm } from "@/features/member/components/member-profile-form";

afterEach(cleanup);

describe("member profile forms", () => {
  it("updates loaded profile values without replacing the form node", () => {
    const onSave = vi.fn(async () => ({ ok: true as const }));
    const { rerender } = render(<MemberProfileForm initialProfile={{ nickname: "Loading", preferredLocale: "en" }} locale="en" onSave={onSave} />);
    const nickname = screen.getByLabelText(/Nickname/i);

    rerender(<MemberProfileForm initialProfile={{ nickname: "Stardust", preferredLocale: "th" }} locale="en" onSave={onSave} />);

    expect(screen.getByLabelText(/Nickname/i)).toBe(nickname);
    expect(nickname).toHaveValue("Stardust");
    expect(screen.getByLabelText("Preferred language")).toHaveValue("th");
  });

  it("saves nickname and preferred language", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => ({ ok: true as const }));
    render(<MemberProfileForm initialProfile={{ nickname: "Stardust", preferredLocale: "th" }} locale="th" onSave={onSave} />);

    await user.clear(screen.getByLabelText(/Nickname/i));
    await user.type(screen.getByLabelText(/Nickname/i), "Lunaris");
    await user.selectOptions(screen.getByLabelText(/ภาษาที่ต้องการ/i), "en");
    await user.click(screen.getByRole("button", { name: /บันทึกข้อมูล/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ nickname: "Lunaris", preferredLocale: "en" }));
    expect(screen.getByRole("status")).toHaveTextContent("บันทึกข้อมูลแล้ว");
  });

  it("adds, edits, makes default, and removes contact channels", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn(async () => ({ ok: true as const }));
    const onUpdate = vi.fn(async () => ({ ok: true as const }));
    const onRemove = vi.fn(async () => ({ ok: true as const }));
    const onSetDefault = vi.fn(async () => ({ ok: true as const }));
    render(<MemberContactList contacts={[{ id: "c1", kind: "Discord", value: "@old", isDefault: false }]} locale="th" onAdd={onAdd} onRemove={onRemove} onSetDefault={onSetDefault} onUpdate={onUpdate} />);

    await user.click(screen.getByRole("button", { name: /แก้ไข Discord/i }));
    await user.clear(screen.getByLabelText(/ค่าช่องทางติดต่อ/i));
    await user.type(screen.getByLabelText(/ค่าช่องทางติดต่อ/i), "@new");
    await user.click(screen.getByRole("button", { name: /บันทึกช่องทาง/i }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith("c1", { kind: "Discord", value: "@new" }));

    await user.click(screen.getByRole("button", { name: /ตั้งเป็นหลัก/i }));
    await waitFor(() => expect(onSetDefault).toHaveBeenCalledWith("c1"));
    await user.click(screen.getByRole("button", { name: /ลบ Discord/i }));
    await waitFor(() => expect(onRemove).toHaveBeenCalledWith("c1"));

    await user.click(screen.getByRole("button", { name: /เพิ่มช่องทาง/i }));
    await user.selectOptions(screen.getByLabelText(/ประเภทช่องทาง/i), "Email");
    await user.type(screen.getByLabelText(/ค่าช่องทางติดต่อ/i), "hello@example.com");
    await user.click(screen.getByRole("button", { name: /เพิ่มช่องทางติดต่อ/i }));
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith({ kind: "Email", value: "hello@example.com" }));
  });

  it("reauthenticates before updating a matching new password", async () => {
    const user = userEvent.setup();
    const onReauthenticate = vi.fn(async () => ({ error: null }));
    const onUpdatePassword = vi.fn(async () => ({ error: null }));
    render(<MemberPasswordForm email="member@example.com" locale="th" onReauthenticate={onReauthenticate} onUpdatePassword={onUpdatePassword} />);

    await user.type(screen.getByLabelText("รหัสผ่านปัจจุบัน"), "old-password");
    await user.type(screen.getByLabelText("รหัสผ่านใหม่"), "new-password-123");
    await user.type(screen.getByLabelText("ยืนยันรหัสผ่านใหม่"), "different-password");
    await user.click(screen.getByRole("button", { name: /อัปเดตรหัสผ่าน/i }));
    expect(onReauthenticate).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("รหัสผ่านใหม่ไม่ตรงกัน");

    await user.clear(screen.getByLabelText("ยืนยันรหัสผ่านใหม่"));
    await user.type(screen.getByLabelText("ยืนยันรหัสผ่านใหม่"), "new-password-123");
    await user.click(screen.getByRole("button", { name: /อัปเดตรหัสผ่าน/i }));

    await waitFor(() => expect(onReauthenticate).toHaveBeenCalledWith({ email: "member@example.com", password: "old-password" }));
    expect(onUpdatePassword).toHaveBeenCalledWith("new-password-123");
    expect(screen.getByRole("status")).toHaveTextContent("เปลี่ยนรหัสผ่านแล้ว");
  });

  it("retains password values when reauthentication fails", async () => {
    const user = userEvent.setup();
    render(<MemberPasswordForm email="member@example.com" locale="en" onReauthenticate={async () => ({ error: { message: "Invalid login credentials" } })} onUpdatePassword={vi.fn()} />);

    await user.type(screen.getByLabelText("Current password"), "wrong-password");
    await user.type(screen.getByLabelText("New password"), "new-password-123");
    await user.type(screen.getByLabelText("Confirm new password"), "new-password-123");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Incorrect email or password"));
    expect(screen.getByLabelText("Current password")).toHaveValue("wrong-password");
  });
});

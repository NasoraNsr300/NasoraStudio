import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { AdminMessagesWorkspace } from "@/features/admin/messages/components/admin-messages-workspace";

const conversations = [{ customerName: "Luna", id: "conversation-1", jobId: "00000000-0000-4000-8000-000000000001", lastMessageAt: "2026-08-12T06:00:00.000Z", messages: [{ body: "ส่งภาพแล้ว", createdAt: "2026-08-12T06:00:00.000Z", id: "message-1", imageAssetId: "00000000-0000-4000-8000-000000000002", senderRole: "member" as const }], title: "ภาพประกอบ — Full Body", unreadCount: 1 }];
afterEach(cleanup);

describe("Admin Messages workspace", () => {
  it("marks a room read and opens one-image lightbox", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue({ json: async () => ({}), ok: true });
    render(<AdminMessagesWorkspace conversations={conversations} fetcher={fetcher} />);
    await user.click(screen.getByRole("button", { name: /Luna/ }));
    expect(fetcher).toHaveBeenCalledWith("/api/admin/notifications/read", expect.objectContaining({ method: "POST" }));
    await user.click(screen.getByRole("button", { name: "ขยายรูปภาพในข้อความ" }));
    expect(screen.getByRole("dialog", { name: "รูปภาพในข้อความ" })).toBeVisible();
  });
  it("shows send state, resets on success, and opens progress in a dialog", async () => {
    const user = userEvent.setup();
    let resolve!: (value: { json(): Promise<object>; ok: boolean }) => void;
    const fetcher = vi.fn().mockImplementation(() => new Promise((done) => { resolve = done; }));
    render(<AdminMessagesWorkspace conversations={conversations} fetcher={fetcher} />);
    await user.type(screen.getByPlaceholderText("พิมพ์ข้อความ..."), "รับทราบ");
    await user.click(screen.getByRole("button", { name: "ส่งข้อความ" }));
    expect(screen.getByRole("button", { name: "กำลังส่ง" })).toBeDisabled();
    resolve({ json: async () => ({}), ok: true });
    await waitFor(() => expect(screen.getByPlaceholderText("พิมพ์ข้อความ...")).toHaveValue(""));
    await user.click(screen.getByRole("button", { name: "เพิ่มความคืบหน้า" }));
    expect(screen.getByRole("dialog", { name: "เพิ่มความคืบหน้า" })).toBeVisible();
  });
});

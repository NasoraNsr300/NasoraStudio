import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(cleanup);

import { AdminMessagesWorkspace } from "@/features/admin/messages/components/admin-messages-workspace";
import { MemberMessagesContent } from "@/features/member/components/member-messages-page";

const conversation = {
  id: "conversation-1",
  jobId: "00000000-0000-4000-8000-000000000111",
  lastMessageAt: "2026-08-10T10:00:00Z",
  messages: [{ body: "ภาพร่างพร้อมตรวจแล้วค่ะ", createdAt: "2026-08-10T10:00:00Z", id: "message-1", senderRole: "admin" as const }],
  title: "Illustration — Full Body",
  unreadCount: 0,
};

describe("job collaboration UI", () => {
  it("renders persisted member conversations and sends to the selected job", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    render(<MemberMessagesContent conversations={[conversation]} fetcher={fetcher} locale="th" />);
    expect(screen.getAllByText("ภาพร่างพร้อมตรวจแล้วค่ะ")).toHaveLength(2);
    fireEvent.change(screen.getByPlaceholderText("พิมพ์ข้อความ..."), { target: { value: "ขอแก้ดวงตานิดหนึ่งค่ะ" } });
    fireEvent.click(screen.getByRole("button", { name: "ส่งข้อความ" }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith(expect.stringContaining(conversation.jobId), expect.objectContaining({ method: "POST" })));
  });

  it("opens a conversation as a dedicated mobile panel and can return to the list", async () => {
    render(<MemberMessagesContent conversations={[conversation]} locale="en" />);
    const layout = screen.getByTestId("member-messages-layout");
    expect(layout).toHaveAttribute("data-mobile-thread-open", "false");
    fireEvent.click(screen.getByRole("button", { name: conversation.title }));
    expect(layout).toHaveAttribute("data-mobile-thread-open", "true");
    fireEvent.click(screen.getByRole("button", { name: "Back to conversations" }));
    expect(layout).toHaveAttribute("data-mobile-thread-open", "false");
  });

  it("lets the admin select a real member thread and post progress", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    render(<AdminMessagesWorkspace conversations={[{ ...conversation, customerName: "Lunaris" }]} fetcher={fetcher} />);
    expect(screen.getAllByText("Lunaris")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "เพิ่มความคืบหน้า" }));
    fireEvent.change(screen.getByLabelText("หัวข้อความคืบหน้า"), { target: { value: "ลงสีรอบแรก" } });
    fireEvent.change(screen.getByLabelText("รายละเอียดความคืบหน้า"), { target: { value: "ส่งภาพให้ตรวจโทนสี" } });
    fireEvent.click(screen.getByRole("button", { name: "บันทึกความคืบหน้า" }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith(expect.stringContaining("/progress"), expect.objectContaining({ method: "POST" })));
  });
});

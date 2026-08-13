import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const normalize = vi.fn();
vi.mock("@/features/member/client/normalize-member-avatar", () => ({ normalizeMemberAvatar: (...args: unknown[]) => normalize(...args) }));

import { MemberAvatarEditor } from "../member-avatar-editor";

afterEach(() => { cleanup(); vi.restoreAllMocks(); URL.revokeObjectURL = vi.fn(); });

describe("MemberAvatarEditor", () => {
  it("previews and uploads a selected avatar", async () => {
    const user = userEvent.setup(); const source = new File(["png"], "portrait.png", { type: "image/png" }); const normalized = new File(["webp"], "avatar.webp", { type: "image/webp" });
    normalize.mockResolvedValue({ file: normalized, height: 512, width: 512 });
    URL.createObjectURL = vi.fn(() => "blob:preview");
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ avatarMediaId: "00000000-0000-4000-8000-000000000202" }), { status: 201 }));
    const changed = vi.fn();
    render(<MemberAvatarEditor avatarMediaId={null} fetcher={fetcher} locale="th" nickname="Nasora" onUploaded={changed} />);
    await user.upload(screen.getByLabelText("เลือกรูปโปรไฟล์"), source);
    expect(screen.getByRole("img", { name: "ตัวอย่างรูปโปรไฟล์" })).toHaveAttribute("src", "blob:preview");
    await user.click(screen.getByRole("button", { name: "อัปโหลดรูปโปรไฟล์" }));
    await waitFor(() => expect(changed).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000202"));
  });

  it("supports drag and drop and exposes a localized error", async () => {
    normalize.mockRejectedValue(new Error("invalid_member_avatar_source"));
    render(<MemberAvatarEditor avatarMediaId={null} locale="th" nickname="Nasora" onUploaded={vi.fn()} />);
    const zone = screen.getByTestId("avatar-dropzone");
    fireEvent.drop(zone, { dataTransfer: { files: [new File(["gif"], "bad.gif", { type: "image/gif" })] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("PNG, JPEG หรือ WebP");
  });
});

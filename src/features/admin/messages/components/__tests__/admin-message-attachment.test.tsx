import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { AdminMessagesWorkspace } from "@/features/admin/messages/components/admin-messages-workspace";

describe("admin chat attachment", () => {
  it("shows an icon attachment control instead of a text-only label", () => {
    render(<AdminMessagesWorkspace conversations={[]} />);
    expect(screen.getByLabelText("แนบรูป")).toBeInTheDocument();
    expect(screen.queryByText(/^รูป$/)).not.toBeInTheDocument();
  });
});

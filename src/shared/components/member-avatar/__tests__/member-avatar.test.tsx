import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MemberAvatar } from "../member-avatar";

describe("MemberAvatar", () => {
  it("renders an authenticated avatar URL and falls back after an image error", () => {
    render(<MemberAvatar avatarMediaId="00000000-0000-4000-8000-000000000202" nickname="Nasora" />);
    const image = screen.getByRole("img", { name: "Nasora" });
    expect(image).toHaveAttribute("src", "/api/member/profile/avatar/00000000-0000-4000-8000-000000000202");
    fireEvent.error(image);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("N")).toBeInTheDocument();
  });

  it("uses the nickname initial when no media exists", () => {
    render(<MemberAvatar avatarMediaId={null} nickname="Stardust" />);
    expect(screen.getByText("S")).toBeInTheDocument();
  });
});

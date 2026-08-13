import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuthSessionProvider, useAuthSession, type AuthClientLike } from "../auth-session-provider";

describe("AuthSessionProvider avatar sync", () => {
  it("loads the owned avatar id and updates mounted consumers locally", async () => {
    const query = { eq: vi.fn(), maybeSingle: vi.fn(async () => ({ data: { avatar_media_id: "00000000-0000-4000-8000-000000000202" }, error: null })), select: vi.fn() };
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
    const client = {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { email: "member@example.com", id: "00000000-0000-4000-8000-000000000101", user_metadata: { nickname: "Nasora" } } } })),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        signInWithPassword: vi.fn(), signOut: vi.fn(), signUp: vi.fn(), updateUser: vi.fn(),
      },
      from: vi.fn(() => query),
    } as unknown as AuthClientLike;
    const wrapper = ({ children }: { children: React.ReactNode }) => <AuthSessionProvider client={client}>{children}</AuthSessionProvider>;
    const { result } = renderHook(() => useAuthSession(), { wrapper });
    await waitFor(() => expect(result.current.user?.avatarMediaId).toBe("00000000-0000-4000-8000-000000000202"));
    act(() => result.current.updateAvatarMediaId("00000000-0000-4000-8000-000000000303"));
    expect(result.current.user?.avatarMediaId).toBe("00000000-0000-4000-8000-000000000303");
  });
});

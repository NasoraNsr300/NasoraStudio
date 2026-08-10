import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider, useAuthSession } from "@/shared/auth/auth-session-provider";

afterEach(cleanup);

function Probe() {
  const session = useAuthSession();
  return <div>
    <span>{session.status}</span>
    <span>{session.user?.email ?? "no-user"}</span>
    <span>{session.user?.nickname ?? "no-nickname"}</span>
    <button onClick={() => session.updateNickname("Lunaris")} type="button">Update nickname</button>
    <button onClick={() => session.signOut()} type="button">Sign out</button>
  </div>;
}

function createClient(initialUser: { email: string; id: string; user_metadata?: Record<string, unknown> } | null = null) {
  let listener: ((event: string, session: { user: typeof initialUser } | null) => void) | undefined;
  const unsubscribe = vi.fn();
  const signOut = vi.fn().mockResolvedValue({ error: null });
  return {
    client: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: initialUser }, error: null }),
        onAuthStateChange: vi.fn((callback) => {
          listener = callback;
          return { data: { subscription: { unsubscribe } } };
        }),
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
        signOut,
        signUp: vi.fn().mockResolvedValue({ error: null }),
        updateUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
    emit(user: typeof initialUser) {
      listener?.("SIGNED_IN", user ? { user } : null);
    },
    signOut,
    unsubscribe,
  };
}

describe("AuthSessionProvider", () => {
  it("loads the current user and follows auth state changes", async () => {
    const auth = createClient(null);
    render(<AuthSessionProvider client={auth.client}><Probe /></AuthSessionProvider>);

    await waitFor(() => expect(screen.getByText("signedOut")).toBeVisible());
    auth.emit({ email: "member@example.com", id: "member-1", user_metadata: { nickname: "Stardust" } });
    await waitFor(() => expect(screen.getByText("signedIn")).toBeVisible());
    expect(screen.getByText("member@example.com")).toBeVisible();
  });

  it("signs out through the auth client and unsubscribes on unmount", async () => {
    const user = userEvent.setup();
    const auth = createClient({ email: "member@example.com", id: "member-1" });
    const { unmount } = render(<AuthSessionProvider client={auth.client}><Probe /></AuthSessionProvider>);

    await waitFor(() => expect(screen.getByText("signedIn")).toBeVisible());
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(auth.signOut).toHaveBeenCalledOnce();
    unmount();
    expect(auth.unsubscribe).toHaveBeenCalledOnce();
  });

  it("falls back to signed out when the initial session request fails", async () => {
    const auth = createClient(null);
    auth.client.auth.getUser.mockRejectedValueOnce(new Error("network unavailable"));
    render(<AuthSessionProvider client={auth.client}><Probe /></AuthSessionProvider>);

    await waitFor(() => expect(screen.getByText("signedOut")).toBeVisible());
  });

  it("updates auth metadata and the visible session nickname", async () => {
    const user = userEvent.setup();
    const auth = createClient({ email: "member@example.com", id: "member-1", user_metadata: { nickname: "Stardust" } });
    render(<AuthSessionProvider client={auth.client}><Probe /></AuthSessionProvider>);

    await waitFor(() => expect(screen.getByText("Stardust")).toBeVisible());
    await user.click(screen.getByRole("button", { name: "Update nickname" }));

    expect(auth.client.auth.updateUser).toHaveBeenCalledWith({ data: { nickname: "Lunaris" } });
    expect(screen.getByText("Lunaris")).toBeVisible();
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MemberProfilePage } from "@/features/member/components/member-profile-page";
import type { MemberProfileClient } from "@/features/member/data/member-profile-repository";
import { AuthSessionProvider, type AuthClientLike } from "@/shared/auth/auth-session-provider";

afterEach(cleanup);

function resultQuery(data: unknown) {
  const query = {
    delete: vi.fn(() => query), eq: vi.fn(() => query), insert: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data, error: null })),
    order: vi.fn(async () => ({ data, error: null })), select: vi.fn(() => query),
    single: vi.fn(async () => ({ data, error: null })), update: vi.fn(() => query),
  };
  return query;
}

describe("MemberProfilePage", () => {
  it("loads the authenticated profile and contact channels", async () => {
    const profileQuery = resultQuery({ user_id: "user-1", nickname: "Lunaris", preferred_locale: "th" });
    const contactsQuery = resultQuery([{ id: "c1", kind: "Discord", value: "@lunaris", is_default: true }]);
    const profileClient = {
      from: vi.fn((table: string) => table === "profiles" ? profileQuery : contactsQuery),
      rpc: vi.fn(async () => ({ data: null, error: null })),
    } as MemberProfileClient;
    const authClient: AuthClientLike = {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: "user-1", email: "member@example.com", user_metadata: { nickname: "Lunaris" } } } })),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        signInWithPassword: vi.fn(async () => ({ error: null })),
        signInWithOAuth: vi.fn(async () => ({ error: null })),
        signOut: vi.fn(async () => ({ error: null })),
        signUp: vi.fn(async () => ({ error: null })),
        updateUser: vi.fn(async () => ({ error: null })),
      },
    };

    render(<AuthSessionProvider client={authClient}><MemberProfilePage locale="th" profileClient={profileClient} /></AuthSessionProvider>);

    expect(await screen.findByDisplayValue("Lunaris")).toBeVisible();
    expect(await screen.findByText("@lunaris")).toBeVisible();
    expect(screen.getByDisplayValue("member@example.com")).toBeDisabled();
    expect(screen.getByRole("complementary")).toHaveTextContent("Lunaris");
  });
});

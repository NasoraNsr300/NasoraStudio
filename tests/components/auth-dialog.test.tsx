import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthDialog } from "@/shared/auth/auth-dialog";
import { AuthSessionProvider, type AuthClientLike } from "@/shared/auth/auth-session-provider";

afterEach(cleanup);

function createAuthClient() {
  const signInWithPassword = vi.fn().mockResolvedValue({ error: null });
  const signUp = vi.fn().mockResolvedValue({ error: null });
  const signInWithOAuth = vi.fn().mockResolvedValue({ error: null });
  const client: AuthClientLike = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword,
      signInWithOAuth,
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signUp,
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  };
  return { client, signInWithOAuth, signInWithPassword, signUp };
}

function renderDialog(client: AuthClientLike, locale: "en" | "th" = "en") {
  const onClose = vi.fn();
  render(<AuthSessionProvider client={client}><AuthDialog locale={locale} onClose={onClose} /></AuthSessionProvider>);
  return onClose;
}

describe("AuthDialog", () => {
  it("validates blank sign-in fields and keeps Google available", async () => {
    const user = userEvent.setup();
    const auth = createAuthClient();
    renderDialog(auth.client);

    expect(screen.getByRole("dialog", { name: "Sign in to Nasora" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByText("Enter a valid email address")).toBeVisible();
    expect(screen.getByText("Password must contain at least 8 characters")).toBeVisible();
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("starts Google sign in from the current localized page", async () => {
    const user = userEvent.setup();
    const auth = createAuthClient();
    renderDialog(auth.client, "en");

    await user.click(screen.getByRole("button", { name: "Continue with Google" }));

    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "http://localhost:3000/auth/callback?locale=en&next=%2Fen" },
    });
  });

  it("shows localized feedback when Google sign in fails", async () => {
    const user = userEvent.setup();
    const auth = createAuthClient();
    auth.signInWithOAuth.mockResolvedValueOnce({ error: { message: "provider unavailable" } });
    renderDialog(auth.client, "en");

    await user.click(screen.getByRole("button", { name: "Continue with Google" }));

    expect(await screen.findByText("Something went wrong. Please try again")).toBeVisible();
  });

  it("submits email and password through Supabase auth", async () => {
    const user = userEvent.setup();
    const auth = createAuthClient();
    const onClose = renderDialog(auth.client);

    await user.type(screen.getByLabelText("Email"), "member@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "member@example.com", password: "password123" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("switches to sign-up and includes nickname and locale metadata", async () => {
    const user = userEvent.setup();
    const auth = createAuthClient();
    renderDialog(auth.client, "th");

    await user.click(screen.getByRole("button", { name: "สมัครสมาชิก" }));
    await user.type(screen.getByLabelText("ชื่อที่ใช้แสดง"), "Stardust");
    await user.type(screen.getByLabelText("อีเมล"), "member@example.com");
    await user.type(screen.getByLabelText("รหัสผ่าน"), "password123");
    await user.click(screen.getByRole("button", { name: "สร้างบัญชี" }));

    expect(auth.signUp).toHaveBeenCalledWith({
      email: "member@example.com",
      options: { data: { nickname: "Stardust", preferred_locale: "th" } },
      password: "password123",
    });
  });
});

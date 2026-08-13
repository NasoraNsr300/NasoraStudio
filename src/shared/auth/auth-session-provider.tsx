"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { createSupabaseBrowserClient } from "@/shared/supabase/client";

import { safeAppReturnTarget } from "./return-target";
import type { AuthIdentity, AuthOperationResult, AuthStatus, GoogleSignInInput, SignUpInput } from "./auth-types";

type AuthUserLike = {
  app_metadata?: Record<string, unknown>;
  email?: string | null;
  id: string;
  user_metadata?: Record<string, unknown>;
};

export type AuthClientLike = {
  auth: {
    getUser(): Promise<{ data: { user: AuthUserLike | null }; error?: unknown }>;
    onAuthStateChange(callback: (event: string, session: { user: AuthUserLike } | null) => void): {
      data: { subscription: { unsubscribe(): void } };
    };
    signInWithPassword(input: { email: string; password: string }): Promise<AuthOperationResult>;
    signInWithOAuth(input: { options: { redirectTo: string }; provider: "google" }): Promise<AuthOperationResult>;
    signOut(): Promise<AuthOperationResult>;
    signUp(input: SignUpInput): Promise<AuthOperationResult>;
    updateUser(input: { data?: Record<string, unknown>; password?: string }): Promise<AuthOperationResult>;
  };
  from?(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{ data: { avatar_media_id?: unknown } | null; error?: unknown }>;
      };
    };
  };
};

type AuthSessionValue = {
  signIn(input: { email: string; password: string }): Promise<AuthOperationResult>;
  signInWithGoogle(input: GoogleSignInInput): Promise<AuthOperationResult>;
  signOut(): Promise<AuthOperationResult>;
  signUp(input: SignUpInput): Promise<AuthOperationResult>;
  status: AuthStatus;
  updateAvatarMediaId(mediaId: string | null): void;
  updateNickname(nickname: string): Promise<AuthOperationResult>;
  updatePassword(password: string): Promise<AuthOperationResult>;
  user: AuthIdentity | null;
};

const AuthSessionContext = createContext<AuthSessionValue | null>(null);

function toIdentity(user: AuthUserLike | null): AuthIdentity | null {
  if (!user) return null;
  const nickname = typeof user.user_metadata?.nickname === "string" && user.user_metadata.nickname.trim()
    ? user.user_metadata.nickname.trim()
    : user.email?.split("@")[0] ?? "Member";
  const role = typeof user.app_metadata?.role === "string" ? user.app_metadata.role : null;
  return { avatarMediaId: null, email: user.email ?? null, id: user.id, nickname, role };
}

async function profileAvatarId(client: AuthClientLike, userId: string) {
  try {
    if (!client.from) return null;
    const { data, error } = await client.from("profiles").select("avatar_media_id").eq("user_id", userId).maybeSingle();
    if (error || typeof data?.avatar_media_id !== "string") return null;
    return data.avatar_media_id;
  } catch { return null; }
}

export function AuthSessionProvider({ children, client }: { children: ReactNode; client?: AuthClientLike }) {
  const authClient = useMemo<AuthClientLike>(
    () => client ?? (createSupabaseBrowserClient() as unknown as AuthClientLike),
    [client],
  );
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthIdentity | null>(null);

  useEffect(() => {
    let active = true;
    const sessionTimeout = new Promise<{ data: { user: null } }>((resolve) => {
      window.setTimeout(() => resolve({ data: { user: null } }), 3_000);
    });
    void Promise.race([authClient.auth.getUser(), sessionTimeout])
      .then(async ({ data }) => {
        if (!active) return;
        const identity = toIdentity(data.user);
        if (identity) identity.avatarMediaId = await profileAvatarId(authClient, identity.id);
        if (!active) return;
        setUser(identity);
        setStatus(identity ? "signedIn" : "signedOut");
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setStatus("signedOut");
      });

    const { data } = authClient.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const identity = toIdentity(session?.user ?? null);
      if (!identity) { setUser(null); setStatus("signedOut"); return; }
      void profileAvatarId(authClient, identity.id).then((avatarMediaId) => {
        if (!active) return;
        setUser({ ...identity, avatarMediaId });
        setStatus("signedIn");
      });
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [authClient]);

  const value = useMemo<AuthSessionValue>(() => ({
    signIn: (input) => authClient.auth.signInWithPassword(input),
    signInWithGoogle: ({ locale, returnTo }) => {
      const target = safeAppReturnTarget(returnTo, locale);
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("locale", locale);
      callback.searchParams.set("next", target);
      return authClient.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback.toString() } });
    },
    signOut: () => authClient.auth.signOut(),
    signUp: (input) => authClient.auth.signUp(input),
    status,
    updateAvatarMediaId: (avatarMediaId) => setUser((current) => current ? { ...current, avatarMediaId } : current),
    updateNickname: async (nickname) => {
      const result = await authClient.auth.updateUser({ data: { nickname } });
      if (!result.error) setUser((current) => current ? { ...current, nickname } : current);
      return result;
    },
    updatePassword: (password) => authClient.auth.updateUser({ password }),
    user,
  }), [authClient, status, user]);

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);
  if (!context) throw new Error("useAuthSession must be used within AuthSessionProvider");
  return context;
}

export function useOptionalAuthSession() {
  return useContext(AuthSessionContext);
}

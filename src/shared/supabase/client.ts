"use client";

import { createBrowserClient } from "@supabase/ssr";

import { readSupabasePublicEnv } from "./env";

type PublicEnvironment = Parameters<typeof readSupabasePublicEnv>[0];

const browserEnvironment: PublicEnvironment = {
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
};

export function createSupabaseBrowserClient(environment: PublicEnvironment = browserEnvironment) {
  const { publishableKey, url } = readSupabasePublicEnv(environment);
  return createBrowserClient(url, publishableKey);
}

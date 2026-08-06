import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import { readSupabasePublicEnv } from "./env";

type PublicEnvironment = Parameters<typeof readSupabasePublicEnv>[0];
type CookieStore = {
  getAll: () => Array<{ name: string; value: string }>;
  set: (name: string, value: string, options: CookieOptions) => unknown;
};

export function createSupabaseServerClient(
  cookieStore: CookieStore,
  environment: PublicEnvironment = process.env,
) {
  const { publishableKey, url } = readSupabasePublicEnv(environment);

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, options, value } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}

export async function createClient() {
  const cookieStore = await cookies();
  return createSupabaseServerClient(cookieStore);
}

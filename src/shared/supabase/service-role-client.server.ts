import "server-only";

import { createClient } from "@supabase/supabase-js";

export function createServiceRoleClient(environment: Record<string, string | undefined> = process.env) {
  const url = environment.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secretKey = environment.SUPABASE_SECRET_KEY?.trim();
  if (!url || !secretKey) throw new Error("service_role_not_configured");
  return createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

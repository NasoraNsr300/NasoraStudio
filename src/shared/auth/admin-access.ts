export const NASORA_ADMIN_EMAIL = "nasora.nsr300@gmail.com";

type AdminUserLike = {
  app_metadata?: Record<string, unknown>;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

export function isNasoraAdmin(user: AdminUserLike | null | undefined): boolean {
  return user?.email === NASORA_ADMIN_EMAIL && user.app_metadata?.role === "admin";
}

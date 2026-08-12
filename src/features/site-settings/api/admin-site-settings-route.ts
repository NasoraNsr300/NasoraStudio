import { revalidatePath } from "next/cache";

import { saveAdminSiteSettingsSchema } from "@/features/site-settings/domain/site-settings";

export function validateSiteSettingsMutation(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid request origin" }, { status: 403 });
  }
  if (request.headers.get("content-type")?.trim().toLowerCase() !== "application/json") {
    return Response.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }
  return null;
}

export async function parseSiteSettingsBody(request: Request) {
  return saveAdminSiteSettingsSchema.safeParse(await request.json().catch(() => null));
}

export function siteSettingsMutationError(error: unknown) {
  if (error instanceof Error && error.message === "Admin access required") {
    return Response.json({ error: error.message }, { status: 403 });
  }
  return Response.json({ error: "บันทึกการตั้งค่าไม่สำเร็จ" }, { status: 400 });
}

export function revalidateSiteSettings() {
  for (const path of ["/admin", "/admin/settings", "/th", "/en", "/th/about", "/en/about", "/th/commission", "/en/commission"]) {
    revalidatePath(path);
  }
}

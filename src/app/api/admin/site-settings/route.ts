import { saveAdminSiteSettings } from "@/features/site-settings/data/admin-site-settings-repository.server";
import {
  parseSiteSettingsBody,
  revalidateSiteSettings,
  siteSettingsMutationError,
  validateSiteSettingsMutation,
} from "@/features/site-settings/api/admin-site-settings-route";

export async function POST(request: Request) {
  const invalid = validateSiteSettingsMutation(request);
  if (invalid) return invalid;
  const input = await parseSiteSettingsBody(request);
  if (!input.success) return Response.json({ error: "ข้อมูลการตั้งค่าไม่ถูกต้อง" }, { status: 400 });

  try {
    const settings = await saveAdminSiteSettings(input.data);
    revalidateSiteSettings();
    return Response.json({ settings });
  } catch (error) {
    return siteSettingsMutationError(error);
  }
}

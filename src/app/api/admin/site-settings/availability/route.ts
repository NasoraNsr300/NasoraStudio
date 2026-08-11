import { z } from "zod";

import { saveAdminCommissionAvailability } from "@/features/site-settings/data/admin-site-settings-repository.server";
import {
  revalidateSiteSettings,
  siteSettingsMutationError,
  validateSiteSettingsMutation,
} from "@/features/site-settings/api/admin-site-settings-route";

const bodySchema = z.object({ commissionsOpen: z.boolean() }).strict();

export async function PATCH(request: Request) {
  const invalid = validateSiteSettingsMutation(request);
  if (invalid) return invalid;
  const input = bodySchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "สถานะเปิดรับงานไม่ถูกต้อง" }, { status: 400 });

  try {
    const commissionsOpen = await saveAdminCommissionAvailability(input.data.commissionsOpen);
    revalidateSiteSettings();
    return Response.json({ commissionsOpen });
  } catch (error) {
    return siteSettingsMutationError(error);
  }
}

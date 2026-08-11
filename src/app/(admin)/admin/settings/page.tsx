import { AdminSiteSettingsForm } from "@/features/site-settings/components/admin-site-settings-form";
import { getAdminSiteSettings } from "@/features/site-settings/data/admin-site-settings-repository.server";

export default async function AdminSettingsPage() {
  const settings = await getAdminSiteSettings();
  return <AdminSiteSettingsForm initialSettings={settings} />;
}

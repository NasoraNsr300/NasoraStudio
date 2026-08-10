import { listMemberNotifications, markMemberNotificationsRead } from "@/features/notifications/data/member-notification-repository.server";
import { isLocale } from "@/shared/i18n/locales";

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale") ?? "th"; if (!isLocale(locale)) return Response.json({ error: "Invalid locale" }, { status: 400 });
  try { const notifications = await listMemberNotifications(locale); return Response.json({ notifications, unread: notifications.filter((item) => !item.read).length }); }
  catch { return Response.json({ error: "Unable to load notifications" }, { status: 401 }); }
}
export async function PATCH(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid request" }, { status: 403 });
  try { await markMemberNotificationsRead(); return new Response(null, { status: 204 }); }
  catch { return Response.json({ error: "Unable to update notifications" }, { status: 401 }); }
}

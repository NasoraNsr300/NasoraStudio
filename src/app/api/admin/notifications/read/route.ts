import { z } from "zod";

import { markAdminConversationRead, markAdminNotificationsRead } from "@/features/admin/notifications/data/admin-notification-repository.server";

const bodySchema = z.union([
  z.object({ conversationId: z.uuid() }).strict(),
  z.object({ notificationIds: z.array(z.string()).min(1).max(50) }).strict(),
]);

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid origin" }, { status: 403 });
  if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") return Response.json({ error: "Expected application/json" }, { status: 415 });
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid read request" }, { status: 400 });
  try {
    if ("conversationId" in body.data) await markAdminConversationRead(body.data.conversationId);
    else await markAdminNotificationsRead(body.data.notificationIds);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Unable to update read state" }, { status: 403 });
  }
}

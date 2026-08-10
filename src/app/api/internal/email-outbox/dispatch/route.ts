import { dispatchAdminEmailBatch } from "@/features/notifications/email/admin-email-dispatcher.server";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return Response.json(await dispatchAdminEmailBatch(process.env));
  } catch {
    return Response.json({ error: "Unable to dispatch email" }, { status: 503 });
  }
}

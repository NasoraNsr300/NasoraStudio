import { processCollaborationCleanup } from "@/features/collaboration/cleanup/collaboration-cleanup.server";

export async function POST(request: Request) {
  const environment = process.env; const secret = environment.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json(await processCollaborationCleanup(environment)); } catch { return Response.json({ error: "Unable to process cleanup" }, { status: 503 }); }
}

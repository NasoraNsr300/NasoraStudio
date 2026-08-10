import { z } from "zod";
import { updateAdminJobStatus } from "@/features/admin/jobs/data/admin-job-repository.server";

const bodySchema = z.object({ publicNote: z.string().trim().max(1_000).nullable().default(null), statusKey: z.enum(["waiting", "sketching", "coloring", "review", "delivery", "completed", "cancelled"]) }).strict();
export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  if (request.headers.get("content-type")?.trim().toLowerCase() !== "application/json" || request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid request" }, { status: 403 });
  const { jobId } = await params;
  const id = z.uuid().safeParse(jobId);
  const input = bodySchema.safeParse(await request.json().catch(() => null));
  if (!id.success || !input.success) return Response.json({ error: "Invalid status" }, { status: 400 });
  try {
    await updateAdminJobStatus({ jobId: id.data, ...input.data });
    return Response.json({ jobId: id.data, statusKey: input.data.statusKey });
  } catch (error) {
    const denied = error instanceof Error && error.message === "Admin access required";
    return Response.json({ error: denied ? "Admin access required" : "Unable to update job status" }, { status: denied ? 403 : 400 });
  }
}

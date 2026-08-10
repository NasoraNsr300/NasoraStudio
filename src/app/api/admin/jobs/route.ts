import { z } from "zod";
import { createManualGuestJob } from "@/features/admin/jobs/data/admin-job-repository.server";

const bodySchema = z.object({ deadline: z.string().date().nullable(), displayName: z.string().trim().min(1).max(120), serviceName: z.string().trim().min(1).max(160), totalThb: z.number().nonnegative().max(21_474_836.47) }).strict();
function validMutation(request: Request) { return request.headers.get("content-type")?.trim().toLowerCase() === "application/json" && request.headers.get("origin") === new URL(request.url).origin; }

export async function POST(request: Request) {
  if (!validMutation(request)) return Response.json({ error: "Invalid request" }, { status: 403 });
  const input = bodySchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "Invalid job" }, { status: 400 });
  try {
    const localized = { en: input.data.serviceName, th: input.data.serviceName };
    const result = await createManualGuestJob({ categoryName: localized, deadline: input.data.deadline, displayName: input.data.displayName, serviceName: localized, totalSatang: Math.round(input.data.totalThb * 100) });
    return Response.json(result, { status: 201 });
  } catch (error) {
    const denied = error instanceof Error && error.message === "Admin access required";
    return Response.json({ error: denied ? "Admin access required" : "Unable to create Guest job" }, { status: denied ? 403 : 400 });
  }
}

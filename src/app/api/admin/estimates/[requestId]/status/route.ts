import { z } from "zod";

import { createClient } from "@/shared/supabase/server";

const bodySchema = z.object({
  reason: z.string().trim().max(1_000).optional(),
  status: z.enum(["reviewing", "declined"]),
}).superRefine((value, context) => {
  if (value.status === "declined" && !value.reason) {
    context.addIssue({ code: "custom", message: "A decline reason is required.", path: ["reason"] });
  }
});

const requestIdSchema = z.string().trim().min(1).max(120);

type StatusClient = {
  auth: { getUser(): Promise<{ data: { user: { app_metadata?: { role?: unknown } } | null }; error: unknown }> };
  rpc(name: string, input: Record<string, unknown>): Promise<{ data: unknown; error: { message?: string } | null }>;
};

function firstRow(data: unknown) {
  return Array.isArray(data) ? data[0] : data;
}

export async function POST(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId: rawRequestId } = await params;
  const requestId = requestIdSchema.safeParse(rawRequestId);
  if (!requestId.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const input = bodySchema.safeParse(payload);
  if (!input.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  const client = await createClient() as unknown as StatusClient;
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) return Response.json({ error: "Authentication required" }, { status: 401 });
  if (authData.user.app_metadata?.role !== "admin") return Response.json({ error: "Admin access required" }, { status: 403 });

  const { data, error } = await client.rpc("admin_transition_commission_request", {
    p_reason: input.data.reason ?? null,
    p_request_id: requestId.data,
    p_status: input.data.status,
  });
  if (error) {
    if (error.message === "admin_required") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error.message === "invalid_request_transition" || error.message === "request_not_found") {
      return Response.json({ error: "Request status can no longer be changed" }, { status: 409 });
    }
    return Response.json({ error: "Unable to update request status" }, { status: 400 });
  }

  const result = firstRow(data);
  if (!result || typeof result !== "object" || !("request_id" in result) || !("status" in result)) {
    return Response.json({ error: "Unable to update request status" }, { status: 400 });
  }
  return Response.json({ requestId: result.request_id, status: result.status });
}

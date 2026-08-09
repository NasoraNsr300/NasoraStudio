export function acceptsMutation(request: Request) {
  if (request.headers.get("content-type")?.toLowerCase() !== "application/json") return { error: "Content-Type must be application/json", status: 415 } as const;
  const origin = request.headers.get("origin");
  try {
    if (!origin || new URL(origin).origin !== new URL(request.url).origin) return { error: "Invalid request origin", status: 403 } as const;
  } catch {
    return { error: "Invalid request origin", status: 403 } as const;
  }
  return null;
}

export async function authenticatedUser(client: { auth: { getUser(): Promise<unknown> } }) {
  const result = await client.auth.getUser() as { data?: { user?: { app_metadata?: Record<string, unknown>; id: string } | null }; error?: unknown };
  return result.error ? null : result.data?.user ?? null;
}

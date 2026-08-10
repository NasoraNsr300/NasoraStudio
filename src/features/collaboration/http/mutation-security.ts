export function isSameOriginJson(request: Request) {
  return request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() === "application/json"
    && request.headers.get("origin") === new URL(request.url).origin;
}

export function collaborationError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (message === "Authentication required") return Response.json({ error: message }, { status: 401 });
  if (message === "Admin access required") return Response.json({ error: message }, { status: 403 });
  return Response.json({ error: fallback }, { status: 400 });
}

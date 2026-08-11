import { revalidatePath } from "next/cache";
import { z } from "zod";

const localizedTitle = z.object({
  en: z.string().trim().min(1).max(200),
  th: z.string().trim().min(1).max(200),
}).strict();

export const portfolioBodySchema = z.object({
  albumId: z.uuid(),
  displayOrder: z.number().int().min(0).max(10_000),
  featured: z.boolean(),
  mediaId: z.uuid(),
  published: z.boolean(),
  showInHero: z.boolean(),
  title: localizedTitle,
}).strict();

export const portfolioArchiveBodySchema = z.object({
  archived: z.boolean(),
  reason: z.string().trim().min(1).max(500).nullable(),
}).strict();

export const portfolioUuidSchema = z.uuid();

export function validatePortfolioMutation(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid request origin" }, { status: 403 });
  }
  if (request.headers.get("content-type")?.trim().toLowerCase() !== "application/json") {
    return Response.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }
  return null;
}

export async function parsePortfolioBody<T>(request: Request, schema: z.ZodType<T>) {
  return schema.safeParse(await request.json().catch(() => null));
}

export function portfolioMutationError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "Admin access required") return Response.json({ error: message }, { status: 403 });
  if (message.includes("not found")) return Response.json({ error: "ไม่พบผลงาน" }, { status: 404 });
  return Response.json({ error: "บันทึกผลงานไม่สำเร็จ" }, { status: 400 });
}

export function revalidatePortfolio() {
  revalidatePath("/admin/portfolio");
  for (const locale of ["th", "en"] as const) {
    revalidatePath(`/${locale}/portfolio`);
    revalidatePath(`/${locale}`);
  }
}

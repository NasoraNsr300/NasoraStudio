import { revalidatePath } from "next/cache";
import { z } from "zod";

const localizedRequired = z.object({ en: z.string().trim().min(1).max(160), th: z.string().trim().min(1).max(160) }).strict();
const localizedOptional = z.object({ en: z.string().trim().max(4_000), th: z.string().trim().max(4_000) }).strict();
const availability = z.enum(["open", "limited", "closed"]);
const slug = z.string().trim().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);

export const albumBodySchema = z.object({
  availability,
  coverMediaId: z.uuid().nullable(),
  description: localizedOptional,
  displayOrder: z.number().int().min(0).max(10_000),
  name: localizedRequired,
  published: z.boolean(),
  recommended: z.boolean(),
  slug,
}).strict();

const modifierSchema = z.object({
  kind: z.enum(["fixed", "percentage"]),
  label: localizedRequired,
  value: z.number().min(0).max(21_474_836.47),
}).strict();

export const serviceBodySchema = z.object({
  availability,
  coverMediaId: z.uuid().nullable(),
  description: localizedOptional,
  displayOrder: z.number().int().min(0).max(10_000),
  documentSlugs: z.array(slug).max(20),
  freeRevisionCount: z.number().int().min(0).max(100),
  modifiers: z.array(modifierSchema).max(20),
  name: localizedRequired,
  published: z.boolean(),
  slug,
  timingGuidance: localizedOptional,
}).strict();

export const serviceUpdateBodySchema = serviceBodySchema.extend({ albumId: z.uuid() }).strict();

export const archiveBodySchema = z.object({
  archived: z.boolean(),
  reason: z.string().trim().min(1).max(500).nullable(),
}).strict();

const priceSchema = z.object({
  amountSatang: z.number().int().min(0).max(2_147_483_647),
  displayOrder: z.number().int().min(0).max(10_000),
  label: localizedRequired,
  pace: z.enum(["normal", "rush"]),
  usage: z.enum(["personal", "commercial"]),
}).strict();

export const pricesBodySchema = z.object({ prices: z.array(priceSchema).max(4) }).strict().superRefine((body, context) => {
  const variants = new Set<string>();
  for (const [index, price] of body.prices.entries()) {
    const variant = `${price.usage}:${price.pace}`;
    if (variants.has(variant)) context.addIssue({ code: "custom", message: "Duplicate price variant", path: ["prices", index] });
    variants.add(variant);
  }
});

export function validateCatalogMutation(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid request origin" }, { status: 403 });
  }
  if (request.headers.get("content-type")?.trim().toLowerCase() !== "application/json") {
    return Response.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }
  return null;
}

export async function parseCatalogBody<T>(request: Request, schema: z.ZodType<T>) {
  return schema.safeParse(await request.json().catch(() => null));
}

export function catalogMutationError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "Admin access required") return Response.json({ error: message }, { status: 403 });
  if (message.includes("already exists")) return Response.json({ error: message }, { status: 409 });
  if (message.includes("not found")) return Response.json({ error: "Catalog item not found" }, { status: 404 });
  return Response.json({ error: "Unable to update catalog" }, { status: 400 });
}

export function revalidateCommissionCatalog(slugValue?: string) {
  for (const locale of ["th", "en"] as const) {
    revalidatePath(`/${locale}/commission`);
    if (slugValue) revalidatePath(`/${locale}/commission/${slugValue}`);
  }
}

export const uuidSchema = z.uuid();


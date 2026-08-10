import { revalidatePath } from "next/cache";
import { z } from "zod";

import { documentCategories } from "@/features/documents/domain/document";
import { hasRichTextContent, parseSafeRichText, type SafeRichTextDocument } from "@/features/documents/domain/rich-text";

const localizedText = (maximum: number) => z.object({ en: z.string().trim().max(maximum), th: z.string().trim().max(maximum) }).strict();
const safeRichText = z.unknown().transform((value, context): SafeRichTextDocument => {
  try { return parseSafeRichText(value); } catch { context.addIssue({ code: "custom", message: "invalid_rich_text" }); return z.NEVER; }
});

export const documentBodySchema = z.object({
  category: z.enum(documentCategories),
  content: z.object({ en: safeRichText, th: safeRichText }).strict(),
  coverMediaId: z.uuid().nullable(),
  displayOrder: z.number().int().min(0).max(100_000),
  pinned: z.boolean(),
  published: z.boolean(),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  summary: localizedText(1_000),
  tags: z.array(localizedText(100)).max(30),
  title: localizedText(200),
}).strict().superRefine((value, context) => {
  if (!value.published) return;
  if (!value.title.en || !value.title.th || !value.summary.en || !value.summary.th || !hasRichTextContent(value.content.en) || !hasRichTextContent(value.content.th)) {
    context.addIssue({ code: "custom", message: "publish_fields_required" });
  }
});

export const documentArchiveBodySchema = z.object({ archived: z.boolean(), reason: z.string().trim().min(1).max(500).nullable() }).strict();
export const documentUuidSchema = z.uuid();

export function validateDocumentMutation(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin" }, { status: 403 });
  if (request.headers.get("content-type")?.trim().toLowerCase() !== "application/json") return Response.json({ error: "Content-Type must be application/json" }, { status: 415 });
  return null;
}
export async function parseDocumentBody<T>(request: Request, schema: z.ZodType<T>) { return schema.safeParse(await request.json().catch(() => null)); }
export function documentMutationError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "Admin access required") return Response.json({ error: message }, { status: 403 });
  if (message === "Document slug already exists") return Response.json({ error: "Slug นี้ถูกใช้แล้ว" }, { status: 409 });
  if (message.toLowerCase().includes("not found")) return Response.json({ error: "ไม่พบเอกสาร" }, { status: 404 });
  return Response.json({ error: "บันทึกเอกสารไม่สำเร็จ" }, { status: 400 });
}
export function revalidateDocuments(slug?: string) {
  revalidatePath("/admin/documents");
  for (const locale of ["th", "en"] as const) { revalidatePath(`/${locale}/documents`); if (slug) revalidatePath(`/${locale}/documents/${slug}`); }
}

import { z } from "zod";

const optionalText = (max: number) => z.string().max(max);

export const estimateDraftSchema = z.object({
  version: z.literal(1),
  usageType: z.enum(["personal", "commercial"]),
  budgetKind: z.enum(["open", "range"]),
  budgetMinThb: z.string().regex(/^\d*$/).max(10),
  budgetMaxThb: z.string().regex(/^\d*$/).max(10),
  requestedDeadline: z.iso.date(),
  description: optionalText(1000),
  moodAndStyle: optionalText(800),
  extraCharacterCount: z.number().int().min(0).max(20),
  backgroundLevel: z.number().int().min(0).max(20),
  propCount: z.number().int().min(0).max(20),
  guestDisplayName: optionalText(120),
  guestContactKind: optionalText(40),
  guestContactValue: optionalText(320),
  savedAt: z.iso.datetime(),
}).strict();

export type EstimateDraftValues = z.infer<typeof estimateDraftSchema>;

export function parseEstimateDraft(value: unknown): EstimateDraftValues {
  const parsed = estimateDraftSchema.parse(value);
  if (new TextEncoder().encode(JSON.stringify(parsed)).byteLength > 16_384) throw new Error("Draft is too large");
  return parsed;
}

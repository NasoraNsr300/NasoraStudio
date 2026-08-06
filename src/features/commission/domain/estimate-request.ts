import { z } from "zod";

const localizedTextSchema = z.object({
  en: z.string().trim().min(1).max(160),
  th: z.string().trim().min(1).max(160),
});

const contactKindSchema = z.enum(["discord", "email", "facebook", "x"]);
const countSchema = z.number().int().min(0).max(20);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const thbSchema = z.number().int().min(0).max(100_000_000);

const budgetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("open") }),
  z.object({ kind: z.literal("range"), maxThb: thbSchema, minThb: thbSchema })
    .refine(({ maxThb, minThb }) => minThb <= maxThb, { message: "Minimum budget cannot exceed maximum budget" }),
]);

const guestSchema = z.object({
  contactKind: contactKindSchema,
  contactValue: z.string().trim().min(1).max(200),
  displayName: z.string().trim().min(1).max(80),
});

const commonSchema = z.object({
  acceptedLegal: z.literal(true),
  backgroundLevel: countSchema,
  budget: budgetSchema,
  description: z.string().trim().min(1).max(1_000),
  extraCharacterCount: countSchema,
  moodAndStyle: z.string().trim().max(800),
  propCount: countSchema,
  requestedDeadline: dateSchema,
  submissionKey: z.string().uuid(),
  usageType: z.enum(["personal", "commercial"]),
});

export const estimateRequestInputSchema = z.discriminatedUnion("requesterMode", [
  commonSchema.extend({ guest: z.undefined().optional(), requesterMode: z.literal("member") }),
  commonSchema.extend({ guest: guestSchema, requesterMode: z.literal("guest") }),
]);

export type EstimateRequestInput = z.infer<typeof estimateRequestInputSchema>;

export type EstimateRequestServiceSnapshot = {
  categoryName: { en: string; th: string };
  categorySlug: string;
  serviceName: { en: string; th: string };
  serviceTypeSlug: string;
};

export type CommissionRequestRpcPayload = {
  accepted_legal: true;
  background_level: number;
  budget_max_satang: number | null;
  budget_min_satang: number | null;
  category_name: { en: string; th: string };
  category_slug: string;
  description: string;
  extra_character_count: number;
  guest_contact: { kind: z.infer<typeof contactKindSchema>; value: string } | null;
  guest_display_name: string | null;
  mood_and_style: string;
  prop_count: number;
  requested_deadline: string;
  requester_mode: "guest" | "member";
  service_type_name: { en: string; th: string };
  service_type_slug: string;
  submission_key: string;
  usage_type: "commercial" | "personal";
};

export function parseEstimateRequest(input: unknown, localToday: string): EstimateRequestInput {
  const parsed = estimateRequestInputSchema.parse(input);
  if (!dateSchema.safeParse(localToday).success) throw new Error("Invalid local date");
  if (parsed.requestedDeadline < localToday) throw new Error("Requested deadline cannot be in the past");
  return parsed;
}

export function toCommissionRequestRpcPayload(
  input: EstimateRequestInput,
  snapshot: EstimateRequestServiceSnapshot,
): CommissionRequestRpcPayload {
  const parsedSnapshot = z.object({
    categoryName: localizedTextSchema,
    categorySlug: z.string().trim().min(1).max(120),
    serviceName: localizedTextSchema,
    serviceTypeSlug: z.string().trim().min(1).max(120),
  }).parse(snapshot);
  const rangedBudget = input.budget.kind === "range" ? input.budget : null;

  return {
    accepted_legal: input.acceptedLegal,
    background_level: input.backgroundLevel,
    budget_max_satang: rangedBudget ? rangedBudget.maxThb * 100 : null,
    budget_min_satang: rangedBudget ? rangedBudget.minThb * 100 : null,
    category_name: parsedSnapshot.categoryName,
    category_slug: parsedSnapshot.categorySlug,
    description: input.description,
    extra_character_count: input.extraCharacterCount,
    guest_contact: input.requesterMode === "guest"
      ? { kind: input.guest.contactKind, value: input.guest.contactValue }
      : null,
    guest_display_name: input.requesterMode === "guest" ? input.guest.displayName : null,
    mood_and_style: input.moodAndStyle,
    prop_count: input.propCount,
    requested_deadline: input.requestedDeadline,
    requester_mode: input.requesterMode,
    service_type_name: parsedSnapshot.serviceName,
    service_type_slug: parsedSnapshot.serviceTypeSlug,
    submission_key: input.submissionKey,
    usage_type: input.usageType,
  };
}

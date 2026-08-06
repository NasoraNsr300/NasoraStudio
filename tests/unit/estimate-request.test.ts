import { describe, expect, it } from "vitest";

import {
  estimateRequestInputSchema,
  parseEstimateRequest,
  toCommissionRequestRpcPayload,
} from "@/features/commission/domain/estimate-request";

const validGuestInput = {
  acceptedLegal: true as const,
  backgroundLevel: 1,
  budget: { kind: "range" as const, maxThb: 6_000, minThb: 3_500 },
  description: "Full-body character beneath a night sky",
  extraCharacterCount: 1,
  guest: { contactKind: "discord" as const, contactValue: "@stardust", displayName: "Stardust" },
  moodAndStyle: "Blue and gold, calm fantasy",
  propCount: 2,
  requestedDeadline: "2026-09-01",
  requesterMode: "guest" as const,
  submissionKey: "8c8b9d06-6619-471f-9b7f-ce1f619827f6",
  usageType: "personal" as const,
};

describe("estimate request contract", () => {
  it("accepts a complete Guest brief", () => {
    expect(estimateRequestInputSchema.parse(validGuestInput)).toMatchObject({
      requesterMode: "guest",
      usageType: "personal",
    });
  });

  it("requires Guest identity but does not accept it for member mode", () => {
    expect(() => estimateRequestInputSchema.parse({ ...validGuestInput, guest: undefined })).toThrow();
    expect(() => estimateRequestInputSchema.parse({ ...validGuestInput, requesterMode: "member" })).toThrow();
    expect(estimateRequestInputSchema.parse({ ...validGuestInput, guest: undefined, requesterMode: "member" })).toMatchObject({
      requesterMode: "member",
    });
  });

  it("rejects invalid budget ranges, counts, text, and legal consent", () => {
    expect(() => estimateRequestInputSchema.parse({ ...validGuestInput, budget: { kind: "range", maxThb: 100, minThb: 200 } })).toThrow();
    expect(() => estimateRequestInputSchema.parse({ ...validGuestInput, extraCharacterCount: -1 })).toThrow();
    expect(() => estimateRequestInputSchema.parse({ ...validGuestInput, description: "" })).toThrow();
    expect(() => estimateRequestInputSchema.parse({ ...validGuestInput, moodAndStyle: "x".repeat(801) })).toThrow();
    expect(() => estimateRequestInputSchema.parse({ ...validGuestInput, acceptedLegal: false })).toThrow();
  });

  it("accepts an open budget", () => {
    expect(estimateRequestInputSchema.parse({ ...validGuestInput, budget: { kind: "open" } }).budget).toEqual({ kind: "open" });
  });

  it("rejects a deadline before the supplied local date", () => {
    expect(() => parseEstimateRequest({ ...validGuestInput, requestedDeadline: "2026-08-05" }, "2026-08-06")).toThrow();
    expect(parseEstimateRequest(validGuestInput, "2026-08-06").requestedDeadline).toBe("2026-09-01");
  });

  it("maps THB to integer satang and snapshots the selected service", () => {
    const payload = toCommissionRequestRpcPayload(parseEstimateRequest(validGuestInput, "2026-08-06"), {
      categoryName: { en: "Illustration", th: "ภาพประกอบ" },
      categorySlug: "illustration",
      serviceName: { en: "Full Body", th: "เต็มตัว" },
      serviceTypeSlug: "illustration-fullbody",
    });

    expect(payload).toMatchObject({
      accepted_legal: true,
      budget_max_satang: 600_000,
      budget_min_satang: 350_000,
      category_slug: "illustration",
      guest_contact: { kind: "discord", value: "@stardust" },
      guest_display_name: "Stardust",
      requester_mode: "guest",
      service_type_slug: "illustration-fullbody",
      submission_key: validGuestInput.submissionKey,
    });
  });
});

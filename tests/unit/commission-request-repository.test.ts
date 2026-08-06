import { describe, expect, it, vi } from "vitest";

import { createCommissionRequestRepository } from "@/features/commission/data/commission-request-repository";

const payload = {
  accepted_legal: true as const,
  background_level: 0,
  budget_max_satang: 600_000,
  budget_min_satang: 350_000,
  category_name: { en: "Illustration", th: "ภาพประกอบ" },
  category_slug: "illustration",
  description: "Night scene",
  extra_character_count: 0,
  guest_contact: { kind: "discord" as const, value: "@guest" },
  guest_display_name: "Guest",
  mood_and_style: "Night",
  prop_count: 0,
  requested_deadline: "2026-09-01",
  requester_mode: "guest" as const,
  service_type_name: { en: "Full Body", th: "เต็มตัว" },
  service_type_slug: "illustration-fullbody",
  submission_key: "8c8b9d06-6619-471f-9b7f-ce1f619827f6",
  usage_type: "personal" as const,
};

describe("commission request repository", () => {
  it("submits the RPC payload and normalizes its reference", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ request_code: "REQ-ABC1234567", request_id: "request-1" }], error: null });
    const repository = createCommissionRequestRepository({ from: vi.fn(), rpc });

    await expect(repository.submit(payload)).resolves.toEqual({
      data: { requestCode: "REQ-ABC1234567", requestId: "request-1" },
      ok: true,
    });
    expect(rpc).toHaveBeenCalledWith("submit_commission_request", { p_payload: payload });
  });

  it("loads member nickname and prefers the default contact", async () => {
    const profileQuery = chainResult({ data: { nickname: "Stardust", user_id: "user-1" }, error: null });
    const contactsQuery = chainResult({ data: [
      { id: "c1", is_default: false, kind: "email", value: "old@example.com" },
      { id: "c2", is_default: true, kind: "discord", value: "@stardust" },
    ], error: null });
    const repository = createCommissionRequestRepository({
      from: vi.fn((table: string) => table === "profiles" ? profileQuery : contactsQuery),
      rpc: vi.fn(),
    });

    await expect(repository.loadMemberIdentity("user-1", "fallback@example.com")).resolves.toEqual({
      data: { contact: { kind: "discord", value: "@stardust" }, nickname: "Stardust" },
      ok: true,
    });
  });

  it("uses the authenticated email when no member contact exists", async () => {
    const repository = createCommissionRequestRepository({
      from: vi.fn((table: string) => table === "profiles"
        ? chainResult({ data: { nickname: "Moon", user_id: "user-1" }, error: null })
        : chainResult({ data: [], error: null })),
      rpc: vi.fn(),
    });

    await expect(repository.loadMemberIdentity("user-1", "moon@example.com")).resolves.toMatchObject({
      data: { contact: { kind: "email", value: "moon@example.com" } },
      ok: true,
    });
  });

  it("lists normalized member requests newest first", async () => {
    const requestQuery = chainResult({ data: [{
      budget_max_satang: 600_000,
      budget_min_satang: 350_000,
      id: "request-1",
      request_code: "REQ-ABC1234567",
      requested_deadline: "2026-09-01",
      service_type_name_snapshot: { en: "Full Body", th: "เต็มตัว" },
      status: "submitted",
      submitted_at: "2026-08-06T10:00:00Z",
      usage_type: "personal",
    }], error: null });
    const repository = createCommissionRequestRepository({ from: vi.fn(() => requestQuery), rpc: vi.fn() });

    const result = await repository.listMine();
    expect(result).toMatchObject({ ok: true, data: [{
      budgetMaxSatang: 600_000,
      budgetMinSatang: 350_000,
      requestCode: "REQ-ABC1234567",
      serviceName: { en: "Full Body", th: "เต็มตัว" },
      status: "submitted",
    }] });
    expect(requestQuery.order).toHaveBeenCalledWith("submitted_at", { ascending: false });
  });

  it("cancels through the guarded RPC and exposes errors", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: [{ request_id: "request-1", status: "cancelled" }], error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "request_not_cancellable" } });
    const repository = createCommissionRequestRepository({ from: vi.fn(), rpc });

    await expect(repository.cancel("request-1")).resolves.toEqual({ data: undefined, ok: true });
    await expect(repository.cancel("request-2")).resolves.toEqual({ message: "request_not_cancellable", ok: false });
  });
});

function chainResult(result: { data: unknown; error: { message?: string } | null }) {
  const query = {
    eq: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(result),
    order: vi.fn().mockResolvedValue(result),
    select: vi.fn(() => query),
  };
  return query;
}

import { describe, expect, it, vi } from "vitest";
import { createGuestEstimateDraftRepository, createMemberEstimateDraftRepository, draftKey } from "@/features/commission/data/estimate-draft-repository";

const draft = { version: 1 as const, usageType: "personal" as const, budgetKind: "open" as const, budgetMinThb: "", budgetMaxThb: "", requestedDeadline: "2099-09-01", description: "Brief", moodAndStyle: "", extraCharacterCount: 0, backgroundLevel: 0, propCount: 0, guestDisplayName: "Moon", guestContactKind: "discord", guestContactValue: "@moon", savedAt: "2026-08-14T00:00:00.000Z" };

describe("guest estimate draft repository", () => {
  it("saves, loads, and deletes a service-scoped versioned draft", async () => {
    const values = new Map<string, string>();
    const storage = { getItem: vi.fn((key: string) => values.get(key) ?? null), setItem: vi.fn((key: string, value: string) => values.set(key, value)), removeItem: vi.fn((key: string) => values.delete(key)) };
    const repo = createGuestEstimateDraftRepository(storage);
    await repo.save("chibi-bust", draft);
    expect(await repo.load("chibi-bust")).toEqual(draft);
    await repo.delete("chibi-bust");
    expect(values.has(draftKey("chibi-bust"))).toBe(false);
  });

  it("removes malformed storage defensively", async () => {
    const storage = { getItem: vi.fn(() => "{bad"), setItem: vi.fn(), removeItem: vi.fn() };
    expect(await createGuestEstimateDraftRepository(storage).load("chibi-bust")).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(draftKey("chibi-bust"));
  });
});

describe("member estimate draft repository", () => {
  it("scopes every operation to authenticated user and service", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { payload: draft }, error: null });
    const secondEq = vi.fn().mockReturnValue({ maybeSingle });
    const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
    const select = vi.fn().mockReturnValue({ eq: firstEq });
    const deleteSecondEq = vi.fn().mockResolvedValue({ error: null });
    const deleteFirstEq = vi.fn().mockReturnValue({ eq: deleteSecondEq });
    const remove = vi.fn().mockReturnValue({ eq: deleteFirstEq });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = { from: vi.fn().mockReturnValue({ delete: remove, select, upsert }) };
    const repo = createMemberEstimateDraftRepository(client, "user-1");

    await expect(repo.load("chibi-bust")).resolves.toEqual(draft);
    await repo.save("chibi-bust", draft);
    await repo.delete("chibi-bust");

    expect(firstEq).toHaveBeenCalledWith("user_id", "user-1");
    expect(secondEq).toHaveBeenCalledWith("service_type_slug", "chibi-bust");
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "user-1", service_type_slug: "chibi-bust", payload: draft }), { onConflict: "user_id,service_type_slug" });
    expect(deleteFirstEq).toHaveBeenCalledWith("user_id", "user-1");
    expect(deleteSecondEq).toHaveBeenCalledWith("service_type_slug", "chibi-bust");
  });

  it("does not expose database errors", async () => {
    const client = { from: vi.fn().mockReturnValue({
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: { message: "private" } }) }) }),
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: "private" } }) }) }) }),
      upsert: vi.fn().mockResolvedValue({ error: { message: "private" } }),
    }) };
    const repo = createMemberEstimateDraftRepository(client, "user-1");
    await expect(repo.load("chibi-bust")).rejects.toThrow("Unable to load estimate draft");
    await expect(repo.save("chibi-bust", draft)).rejects.toThrow("Unable to save estimate draft");
    await expect(repo.delete("chibi-bust")).rejects.toThrow("Unable to delete estimate draft");
  });
});

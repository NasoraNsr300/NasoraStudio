import { describe, expect, it, vi } from "vitest";

import { createMemberProfileRepository } from "@/features/member/data/member-profile-repository";

function queryResult(data: unknown = null) {
  const query = {
    delete: vi.fn(() => query),
    eq: vi.fn(() => query),
    insert: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data, error: null })),
    order: vi.fn(async () => ({ data, error: null })),
    select: vi.fn(() => query),
    single: vi.fn(async () => ({ data, error: null })),
    update: vi.fn(() => query),
  };
  return query;
}

describe("member profile repository", () => {
  it("loads only the authenticated user's profile and contacts", async () => {
    const profileQuery = queryResult({ nickname: "Lunaris", preferred_locale: "th", user_id: "user-1" });
    const contactQuery = queryResult([]);
    const client = {
      from: vi.fn((table: string) => table === "profiles" ? profileQuery : contactQuery),
      rpc: vi.fn(),
    };

    const repository = createMemberProfileRepository(client, "user-1");
    await repository.load();

    expect(profileQuery.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(contactQuery.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("uses the authenticated owner for profile and contact writes", async () => {
    const profileQuery = queryResult({ nickname: "Nasora", preferred_locale: "en", user_id: "user-1" });
    const contactQuery = queryResult({ id: "contact-1", user_id: "user-1", kind: "Discord", value: "@nasora", is_default: false });
    const client = {
      from: vi.fn((table: string) => table === "profiles" ? profileQuery : contactQuery),
      rpc: vi.fn(),
    };
    const repository = createMemberProfileRepository(client, "user-1");

    await repository.updateProfile({ nickname: "Nasora", preferredLocale: "en" });
    await repository.addContact({ kind: "Discord", value: "@nasora" });

    expect(profileQuery.update).toHaveBeenCalledWith(expect.objectContaining({ nickname: "Nasora", preferred_locale: "en" }));
    expect(profileQuery.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(contactQuery.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "user-1" }));
  });

  it("sets the default contact through the ownership-safe database function", async () => {
    const client = {
      from: vi.fn(() => queryResult()),
      rpc: vi.fn(async () => ({ data: null, error: null })),
    };
    const repository = createMemberProfileRepository(client, "user-1");

    const result = await repository.setDefaultContact("contact-1");

    expect(result.ok).toBe(true);
    expect(client.rpc).toHaveBeenCalledWith("set_default_contact_channel", { contact_id: "contact-1" });
  });

  it("rejects invalid profile and contact values before querying Supabase", async () => {
    const client = { from: vi.fn(() => queryResult()), rpc: vi.fn() };
    const repository = createMemberProfileRepository(client, "user-1");

    expect((await repository.updateProfile({ nickname: "", preferredLocale: "th" })).ok).toBe(false);
    expect((await repository.addContact({ kind: "", value: "" })).ok).toBe(false);
    expect(client.from).not.toHaveBeenCalled();
  });
});

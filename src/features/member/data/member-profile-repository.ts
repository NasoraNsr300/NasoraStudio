import { z } from "zod";

export type MemberProfile = {
  nickname: string;
  preferredLocale: "th" | "en";
  userId: string;
};

export type ContactChannel = {
  id: string;
  isDefault: boolean;
  kind: string;
  value: string;
};

export type MutationResult<T = undefined> =
  | { data: T; ok: true }
  | { message: string; ok: false };

type QueryError = { message?: string } | null;
type QueryResult = { data: unknown; error: QueryError };

export type MemberProfileQuery = {
  delete(): MemberProfileQuery;
  eq(column: string, value: string): MemberProfileQuery;
  insert(input: Record<string, unknown>): MemberProfileQuery;
  maybeSingle(): Promise<QueryResult>;
  order(column: string, options?: { ascending?: boolean }): Promise<QueryResult>;
  select(columns?: string): MemberProfileQuery;
  single(): Promise<QueryResult>;
  update(input: Record<string, unknown>): MemberProfileQuery;
};

export type MemberProfileClient = {
  from(table: string): MemberProfileQuery;
  rpc(name: string, input: Record<string, unknown>): Promise<QueryResult>;
};

const profileInputSchema = z.object({
  nickname: z.string().trim().min(1).max(60),
  preferredLocale: z.enum(["th", "en"]),
});

const contactInputSchema = z.object({
  kind: z.string().trim().min(1).max(40),
  value: z.string().trim().min(1).max(200),
});

const idSchema = z.string().trim().min(1);

function failure(error: QueryError | unknown): MutationResult<never> {
  const message = error && typeof error === "object" && "message" in error && typeof error.message === "string"
    ? error.message
    : "Unable to save your changes";
  return { message, ok: false };
}

function toProfile(row: unknown): MemberProfile | null {
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;
  if (typeof value.user_id !== "string" || typeof value.nickname !== "string") return null;
  return {
    nickname: value.nickname,
    preferredLocale: value.preferred_locale === "en" ? "en" : "th",
    userId: value.user_id,
  };
}

function toContact(row: unknown): ContactChannel | null {
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;
  if (typeof value.id !== "string" || typeof value.kind !== "string" || typeof value.value !== "string") return null;
  return { id: value.id, isDefault: value.is_default === true, kind: value.kind, value: value.value };
}

export function createMemberProfileRepository(client: MemberProfileClient, userId: string) {
  return {
    async addContact(input: { kind: string; value: string }): Promise<MutationResult<ContactChannel>> {
      const parsed = contactInputSchema.safeParse(input);
      if (!parsed.success) return failure(parsed.error);
      const { data, error } = await client.from("contact_channels").insert({
        is_default: false,
        kind: parsed.data.kind,
        user_id: userId,
        value: parsed.data.value,
      }).select().single();
      if (error) return failure(error);
      const contact = toContact(data);
      return contact ? { data: contact, ok: true } : failure(null);
    },

    async load(): Promise<MutationResult<{ contacts: ContactChannel[]; profile: MemberProfile | null }>> {
      const [profileResult, contactResult] = await Promise.all([
        client.from("profiles").select("user_id,nickname,preferred_locale").eq("user_id", userId).maybeSingle(),
        client.from("contact_channels").select("id,kind,value,is_default").eq("user_id", userId).order("created_at", { ascending: true }),
      ]);
      if (profileResult.error) return failure(profileResult.error);
      if (contactResult.error) return failure(contactResult.error);
      const rows = Array.isArray(contactResult.data) ? contactResult.data : [];
      return {
        data: { contacts: rows.map(toContact).filter((item): item is ContactChannel => item !== null), profile: toProfile(profileResult.data) },
        ok: true,
      };
    },

    async removeContact(contactId: string): Promise<MutationResult> {
      if (!idSchema.safeParse(contactId).success) return failure(null);
      const { error } = await client.from("contact_channels").delete().eq("id", contactId).eq("user_id", userId).select().maybeSingle();
      return error ? failure(error) : { data: undefined, ok: true };
    },

    async setDefaultContact(contactId: string): Promise<MutationResult> {
      if (!idSchema.safeParse(contactId).success) return failure(null);
      const { error } = await client.rpc("set_default_contact_channel", { contact_id: contactId });
      return error ? failure(error) : { data: undefined, ok: true };
    },

    async updateContact(contactId: string, input: { kind: string; value: string }): Promise<MutationResult<ContactChannel>> {
      const parsed = contactInputSchema.safeParse(input);
      if (!parsed.success || !idSchema.safeParse(contactId).success) return failure(parsed.success ? null : parsed.error);
      const { data, error } = await client.from("contact_channels").update({
        kind: parsed.data.kind,
        updated_at: new Date().toISOString(),
        value: parsed.data.value,
      }).eq("id", contactId).eq("user_id", userId).select().single();
      if (error) return failure(error);
      const contact = toContact(data);
      return contact ? { data: contact, ok: true } : failure(null);
    },

    async updateProfile(input: { nickname: string; preferredLocale: string }): Promise<MutationResult<MemberProfile>> {
      const parsed = profileInputSchema.safeParse(input);
      if (!parsed.success) return failure(parsed.error);
      const { data, error } = await client.from("profiles").update({
        nickname: parsed.data.nickname,
        preferred_locale: parsed.data.preferredLocale,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId).select().single();
      if (error) return failure(error);
      const profile = toProfile(data);
      return profile ? { data: profile, ok: true } : failure(null);
    },
  };
}

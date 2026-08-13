import { parseEstimateDraft, type EstimateDraftValues } from "../domain/estimate-draft";

export type EstimateDraftRepository = {
  delete(serviceTypeSlug: string): Promise<void>;
  load(serviceTypeSlug: string): Promise<EstimateDraftValues | null>;
  save(serviceTypeSlug: string, draft: EstimateDraftValues): Promise<void>;
};

export function draftKey(serviceTypeSlug: string) {
  return `nasora:estimate-draft:v1:${serviceTypeSlug}`;
}

type DraftStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export function createGuestEstimateDraftRepository(storage: DraftStorage): EstimateDraftRepository {
  return {
    async delete(serviceTypeSlug) { storage.removeItem(draftKey(serviceTypeSlug)); },
    async load(serviceTypeSlug) {
      const key = draftKey(serviceTypeSlug);
      const value = storage.getItem(key);
      if (!value) return null;
      try { return parseEstimateDraft(JSON.parse(value)); }
      catch { storage.removeItem(key); return null; }
    },
    async save(serviceTypeSlug, draft) { storage.setItem(draftKey(serviceTypeSlug), JSON.stringify(parseEstimateDraft(draft))); },
  };
}

export type EstimateDraftClient = {
  from(table: "estimate_request_drafts"): {
    delete(): { eq(column: string, value: string): { eq(column: string, value: string): Promise<{ error: unknown }> } };
    select(columns: string): { eq(column: string, value: string): { eq(column: string, value: string): { maybeSingle(): Promise<{ data: { payload: unknown } | null; error: unknown }> } } };
    upsert(value: Record<string, unknown>, options: { onConflict: string }): Promise<{ error: unknown }>;
  };
};

export function createMemberEstimateDraftRepository(client: EstimateDraftClient, userId: string): EstimateDraftRepository {
  return {
    async delete(serviceTypeSlug) {
      const { error } = await client.from("estimate_request_drafts").delete().eq("user_id", userId).eq("service_type_slug", serviceTypeSlug);
      if (error) throw new Error("Unable to delete estimate draft");
    },
    async load(serviceTypeSlug) {
      const { data, error } = await client.from("estimate_request_drafts").select("payload").eq("user_id", userId).eq("service_type_slug", serviceTypeSlug).maybeSingle();
      if (error) throw new Error("Unable to load estimate draft");
      return data ? parseEstimateDraft(data.payload) : null;
    },
    async save(serviceTypeSlug, draft) {
      const { error } = await client.from("estimate_request_drafts").upsert({ user_id: userId, service_type_slug: serviceTypeSlug, payload: parseEstimateDraft(draft) }, { onConflict: "user_id,service_type_slug" });
      if (error) throw new Error("Unable to save estimate draft");
    },
  };
}

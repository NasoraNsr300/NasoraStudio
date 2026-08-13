import "server-only";

import { z } from "zod";

import { createPaymentGatewayClient } from "@/features/payments/data/payment-gateway-client.server";
import { createClient } from "@/shared/supabase/server";

const uuid = z.uuid();
const objectSchema = z.object({ content_type: z.literal("image/webp"), etag: z.string().min(1), object_key: z.string().regex(/^member-avatars\/[0-9a-f-]{36}\.webp$/), size_bytes: z.coerce.number().int().min(1).max(5 * 1024 * 1024) });

async function sessionUserId() {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Authentication required");
  return uuid.parse(data.user.id);
}

export async function finalizeMemberAvatar(input: { etag: string; mediaId: string; objectKey: string; sizeBytes: number }) {
  const userId = await sessionUserId();
  const gateway = createPaymentGatewayClient();
  const { data, error } = await gateway.rpc("gateway_finalize_profile_avatar", { p_etag: input.etag, p_media_id: uuid.parse(input.mediaId), p_object_key: input.objectKey, p_size_bytes: input.sizeBytes, p_user_id: userId });
  if (error) throw new Error("Unable to save profile avatar");
  return { mediaId: uuid.parse(data), userId };
}

export async function getMemberAvatarObject(mediaId: string) {
  const userId = await sessionUserId();
  const gateway = createPaymentGatewayClient();
  const { data, error } = await gateway.rpc("gateway_get_profile_avatar", { p_media_id: uuid.parse(mediaId), p_user_id: userId });
  if (error) throw new Error("Unable to load profile avatar");
  const row = z.array(objectSchema).max(1).parse(data ?? [])[0];
  return row ? { contentType: row.content_type, etag: row.etag, objectKey: row.object_key, sizeBytes: row.size_bytes } : null;
}

import { inspectImageUpload } from "@/features/media/domain/image-upload";

export { avatarMediaUrl } from "@/shared/auth/avatar-media-url";

export const MEMBER_AVATAR_EDGE = 512;
export const MEMBER_AVATAR_SOURCE_LIMIT_BYTES = 5 * 1024 * 1024;
export const MEMBER_AVATAR_SOURCE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function centeredSquareCrop(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) throw new Error("invalid_member_avatar_source");
  const edge = Math.min(width, height);
  return { height: edge, width: edge, x: (width - edge) / 2, y: (height - edge) / 2 };
}

export async function inspectMemberAvatar(file: Pick<File, "arrayBuffer" | "size" | "type">) {
  try {
    const inspected = await inspectImageUpload(file);
    if (inspected.contentType !== "image/webp" || inspected.width !== MEMBER_AVATAR_EDGE || inspected.height !== MEMBER_AVATAR_EDGE) throw new Error("invalid_member_avatar");
    return inspected;
  } catch {
    throw new Error("invalid_member_avatar");
  }
}

export function validateMemberAvatarSource(file: Pick<File, "size" | "type">) {
  if (file.size < 1 || file.size > MEMBER_AVATAR_SOURCE_LIMIT_BYTES || !(MEMBER_AVATAR_SOURCE_TYPES as readonly string[]).includes(file.type)) {
    throw new Error("invalid_member_avatar_source");
  }
}

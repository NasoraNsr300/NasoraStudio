import { centeredSquareCrop, inspectMemberAvatar, MEMBER_AVATAR_EDGE, validateMemberAvatarSource } from "@/features/member/domain/member-avatar";

async function exportWebp(bitmap: ImageBitmap, crop: ReturnType<typeof centeredSquareCrop>) {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(MEMBER_AVATAR_EDGE, MEMBER_AVATAR_EDGE);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("member_avatar_conversion_failed");
    context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, MEMBER_AVATAR_EDGE, MEMBER_AVATAR_EDGE);
    return canvas.convertToBlob({ quality: 0.86, type: "image/webp" });
  }

  const canvas = document.createElement("canvas");
  canvas.width = MEMBER_AVATAR_EDGE;
  canvas.height = MEMBER_AVATAR_EDGE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("member_avatar_conversion_failed");
  context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, MEMBER_AVATAR_EDGE, MEMBER_AVATAR_EDGE);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error("member_avatar_conversion_failed")),
    "image/webp",
    0.86,
  ));
}

export async function normalizeMemberAvatar(source: File) {
  validateMemberAvatarSource(source);
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(source, { imageOrientation: "from-image" }); }
  catch { throw new Error("invalid_member_avatar_source"); }
  try {
    const blob = await exportWebp(bitmap, centeredSquareCrop(bitmap.width, bitmap.height));
    const file = new File([blob], "avatar.webp", { lastModified: Date.now(), type: "image/webp" });
    await inspectMemberAvatar(file);
    return { file, height: MEMBER_AVATAR_EDGE, width: MEMBER_AVATAR_EDGE };
  } finally { bitmap.close(); }
}

import { createR2PrivateAssetsStorage } from "@/features/collaboration/storage/r2-private-assets.server";
import { MEMBER_AVATAR_SOURCE_LIMIT_BYTES } from "@/features/member/domain/member-avatar";
import { finalizeMemberAvatar } from "@/features/member/data/member-avatar-repository.server";
import { persistMemberAvatar } from "@/features/member/server/persist-member-avatar.server";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin" }, { status: 403 });
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "multipart/form-data") return Response.json({ error: "Invalid avatar upload" }, { status: 415 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (file === null || typeof file === "string") return Response.json({ error: "Invalid avatar upload" }, { status: 400 });
    if (file.size > MEMBER_AVATAR_SOURCE_LIMIT_BYTES) return Response.json({ error: "Avatar is too large" }, { status: 413 });
    const result = await persistMemberAvatar({ file, finalize: finalizeMemberAvatar, storage: createR2PrivateAssetsStorage() });
    return Response.json({ avatarMediaId: result.avatarMediaId, avatarUrl: result.avatarUrl }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") return Response.json({ error: "Authentication required" }, { status: 401 });
    return Response.json({ error: "Unable to upload profile avatar" }, { status: 400 });
  }
}

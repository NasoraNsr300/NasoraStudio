export function avatarMediaUrl(mediaId: string | null | undefined) {
  return mediaId ? `/api/member/profile/avatar/${mediaId}` : null;
}

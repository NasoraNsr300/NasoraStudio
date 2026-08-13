"use client";

import { useState } from "react";

import { avatarMediaUrl } from "@/features/member/domain/member-avatar";

import styles from "./member-avatar.module.css";

export function MemberAvatar({ avatarMediaId, className = "", nickname }: { avatarMediaId: string | null | undefined; className?: string; nickname: string }) {
  const src = avatarMediaUrl(avatarMediaId);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const initial = nickname.trim().charAt(0).toUpperCase() || "M";
  if (!src || failedSrc === src) return <span aria-hidden="true" className={`${styles.fallback} ${className}`}>{initial}</span>;
  // This authenticated media route requires the browser session cookie, so Next's server image optimizer cannot fetch it.
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={nickname} className={`${styles.image} ${className}`} onError={() => setFailedSrc(src)} src={src} />;
}

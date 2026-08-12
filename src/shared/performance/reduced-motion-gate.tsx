"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const query = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => undefined;
  const media = window.matchMedia(query);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot() {
  return typeof window.matchMedia === "function" && window.matchMedia(query).matches;
}

export function ReducedMotionGate({ children }: { children: ReactNode }) {
  const reduced = useSyncExternalStore(subscribe, getSnapshot, () => true);
  return reduced ? null : children;
}

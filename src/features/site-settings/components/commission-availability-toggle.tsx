"use client";

import { useEffect, useState } from "react";

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<{
  json(): Promise<{ commissionsOpen?: boolean; error?: string }>;
  ok: boolean;
}>;

export function CommissionAvailabilityToggle({
  className,
  fetcher = fetch,
  initialOpen,
  showStatusLabel = false,
}: {
  className?: string;
  fetcher?: Fetcher;
  initialOpen: boolean;
  showStatusLabel?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function sync(event: Event) {
      const detail = (event as CustomEvent<{ open?: unknown }>).detail;
      if (typeof detail?.open === "boolean") setOpen(detail.open);
    }
    window.addEventListener("nasora:commission-availability", sync);
    return () => window.removeEventListener("nasora:commission-availability", sync);
  }, []);

  async function toggle() {
    if (saving) return;
    const previous = open;
    const next = !open;
    setOpen(next);
    setSaving(true);
    setError("");
    try {
      const response = await fetcher("/api/admin/site-settings/availability", {
        body: JSON.stringify({ commissionsOpen: next }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const body = await response.json();
      if (!response.ok || typeof body.commissionsOpen !== "boolean") {
        throw new Error(body.error ?? "บันทึกสถานะไม่สำเร็จ");
      }
      setOpen(body.commissionsOpen);
      window.dispatchEvent(new CustomEvent("nasora:commission-availability", { detail: { open: body.commissionsOpen } }));
    } catch (cause) {
      setOpen(previous);
      setError(cause instanceof Error ? cause.message : "บันทึกสถานะไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return <span>
    {showStatusLabel ? (open ? "เปิดรับงาน" : "ปิดรับงาน") : null}
    <button
      aria-checked={open}
      aria-label="สถานะเปิดรับงาน"
      aria-live="polite"
      className={className}
      disabled={saving}
      onClick={toggle}
      role="switch"
      type="button"
    ><i /></button>
    {error ? <small role="alert">{error}</small> : null}
  </span>;
}

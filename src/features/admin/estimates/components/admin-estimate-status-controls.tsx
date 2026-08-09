"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminEstimateStatus } from "@/features/admin/estimates/domain/admin-estimate";
import styles from "@/features/admin/components/admin-section-pages.module.css";

export function AdminEstimateStatusControls({ requestId, status }: { requestId: string; status: AdminEstimateStatus }) {
  const router = useRouter();
  const [declineOpen, setDeclineOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [reason, setReason] = useState("");

  async function changeStatus(nextStatus: "declined" | "reviewing") {
    const trimmedReason = reason.trim();
    if (nextStatus === "declined" && !trimmedReason) {
      setError("A decline reason is required.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/estimates/${requestId}/status`, {
        body: JSON.stringify(nextStatus === "declined" ? { reason: trimmedReason, status: nextStatus } : { status: nextStatus }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        setError(body?.error ?? "Unable to update request status.");
        return;
      }
      router.refresh();
    } catch {
      setError("Unable to update request status.");
    } finally {
      setIsSaving(false);
    }
  }

  const canReview = status === "submitted";
  const canDecline = status === "submitted" || status === "reviewing";
  if (!canReview && !canDecline) return null;

  return <>
    <footer>
      {canReview && <button className={styles.rowAction} disabled={isSaving} onClick={() => changeStatus("reviewing")} type="button">Review request</button>}
      {canDecline && <button className={styles.dangerAction} disabled={isSaving} onClick={() => setDeclineOpen(true)} type="button">Decline request</button>}
    </footer>
    {declineOpen && <section aria-label="Decline confirmation" className={styles.declineConfirm}><label>Decline reason<textarea onChange={(event) => setReason(event.target.value)} value={reason} /></label>{error && <p role="alert">{error}</p>}<div><button disabled={isSaving} onClick={() => changeStatus("declined")} type="button">Confirm decline</button><button disabled={isSaving} onClick={() => setDeclineOpen(false)} type="button">Cancel</button></div></section>}
  </>;
}

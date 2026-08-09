"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminQuoteDraftInput, AdminQuoteItemType, AdminQuoteLocalizedText } from "@/features/admin/estimates/domain/admin-estimate";
import styles from "@/features/admin/estimates/components/admin-quote-editor.module.css";

type EditableItem = {
  description: AdminQuoteLocalizedText;
  itemType: AdminQuoteItemType;
  label: AdminQuoteLocalizedText;
  quantity: number;
  unitAmountThb: string;
};

const approximateThbPerUsd = 35;

function futureExpiryValue() {
  const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000);
  const offset = expiry.getTimezoneOffset() * 60_000;
  return new Date(expiry.getTime() - offset).toISOString().slice(0, 16);
}

function toSatang(amountThb: string) {
  const amount = Number(amountThb);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function formatThb(satang: number) {
  return `฿${new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2, minimumFractionDigits: satang % 100 === 0 ? 0 : 2 }).format(satang / 100)}`;
}

function newAddition(): EditableItem {
  return {
    description: { en: "Additional work", th: "งานเพิ่มเติม" },
    itemType: "other",
    label: { en: "Addition", th: "รายการเพิ่มเติม" },
    quantity: 1,
    unitAmountThb: "0",
  };
}

export function AdminQuoteEditor({ requestId, requestedDeadline, serviceName }: {
  requestId: string;
  requestedDeadline: string | null;
  serviceName: AdminQuoteLocalizedText;
}) {
  const router = useRouter();
  const [depositPercent, setDepositPercent] = useState(50);
  const [durationMaxDays, setDurationMaxDays] = useState(14);
  const [durationMinDays, setDurationMinDays] = useState(7);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState(futureExpiryValue);
  const [freeRevisions, setFreeRevisions] = useState(4);
  const [isSaving, setIsSaving] = useState(false);
  const [items, setItems] = useState<EditableItem[]>([{ description: serviceName, itemType: "base", label: serviceName, quantity: 1, unitAmountThb: "0" }]);
  const [proposedDeadline, setProposedDeadline] = useState(requestedDeadline ?? "");
  const [scope, setScope] = useState(serviceName);
  const [submissionKey] = useState(() => crypto.randomUUID());
  const [termsSlug, setTermsSlug] = useState("commission-terms");
  const [termsVersion, setTermsVersion] = useState(1);

  const itemSnapshots = items.map((item) => {
    const unitAmountSatang = toSatang(item.unitAmountThb);
    return { ...item, lineTotalSatang: unitAmountSatang * item.quantity, unitAmountSatang };
  });
  const totalSatang = itemSnapshots.reduce((total, item) => total + item.lineTotalSatang, 0);
  const approximateUsd = totalSatang / 100 / approximateThbPerUsd;

  function updateItem(index: number, update: Partial<EditableItem>) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...update } : item));
  }

  function updateLocalizedItem(index: number, field: "description" | "label", locale: "en" | "th", value: string) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index
      ? { ...item, [field]: { ...item[field], [locale]: value } }
      : item));
  }

  async function sendQuote() {
    setError(null);
    const expiry = new Date(expiresAt);
    const hasInvalidItem = itemSnapshots.some((item) => !Number.isInteger(item.quantity) || item.quantity <= 0 || !Number.isSafeInteger(item.unitAmountSatang) || !Number.isSafeInteger(item.lineTotalSatang) || !item.label.en.trim() || !item.label.th.trim() || !item.description.en.trim() || !item.description.th.trim());
    if (!scope.en.trim() || !scope.th.trim()
      || !expiresAt || Number.isNaN(expiry.getTime())
      || !Number.isInteger(durationMinDays) || !Number.isInteger(durationMaxDays) || durationMinDays <= 0 || durationMaxDays < durationMinDays
      || !Number.isInteger(depositPercent) || depositPercent < 0 || depositPercent > 100
      || !Number.isInteger(freeRevisions) || freeRevisions < 0
      || !termsSlug.trim() || !Number.isInteger(termsVersion) || termsVersion <= 0
      || !Number.isSafeInteger(totalSatang) || totalSatang < 0 || hasInvalidItem) {
      setError("Complete a valid quote before sending.");
      return;
    }
    setIsSaving(true);
    const payload: AdminQuoteDraftInput = {
      depositPercent,
      durationMaxDays,
      durationMinDays,
      expiresAt: expiry.toISOString(),
      freeRevisions,
      idempotencyKey: submissionKey,
      items: itemSnapshots.map(({ unitAmountThb: _unitAmountThb, ...item }) => item),
      proposedDeadline: proposedDeadline || null,
      scope,
      termsDocument: { slug: termsSlug, version: termsVersion },
      totalSatang,
    };

    try {
      const response = await fetch(`/api/admin/estimates/${requestId}/quotes`, {
        body: JSON.stringify(payload),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        setError(body?.error ?? "Unable to send quote.");
        return;
      }
      router.refresh();
    } catch {
      setError("Unable to send quote.");
    } finally {
      setIsSaving(false);
    }
  }

  return <section aria-label="Manual quote editor" className={styles.editor}>
    <header><div><small>Immutable price snapshot</small><h3>Manual quote</h3></div><strong data-testid="quote-total-thb">{formatThb(totalSatang)}</strong></header>
    <div className={styles.fields}>
      <label>Scope (English)<textarea onChange={(event) => setScope((value) => ({ ...value, en: event.target.value }))} value={scope.en} /></label>
      <label>Scope (Thai)<textarea onChange={(event) => setScope((value) => ({ ...value, th: event.target.value }))} value={scope.th} /></label>
    </div>
    <div className={styles.items}>
      {items.map((item, index) => <fieldset aria-label={`Quote item ${index + 1}`} key={index}>
        <legend>Item {index + 1}</legend>
        <label>Type<select onChange={(event) => updateItem(index, { itemType: event.target.value as AdminQuoteItemType })} value={item.itemType}>
          <option value="base">Base work</option><option value="character">Character</option><option value="background">Background</option><option value="prop">Prop</option><option value="rush">Rush</option><option value="discount">Discount</option><option value="other">Other</option>
        </select></label>
        <label>Label (English)<input onChange={(event) => updateLocalizedItem(index, "label", "en", event.target.value)} value={item.label.en} /></label>
        <label>Label (Thai)<input onChange={(event) => updateLocalizedItem(index, "label", "th", event.target.value)} value={item.label.th} /></label>
        <label>Description (English)<input onChange={(event) => updateLocalizedItem(index, "description", "en", event.target.value)} value={item.description.en} /></label>
        <label>Description (Thai)<input onChange={(event) => updateLocalizedItem(index, "description", "th", event.target.value)} value={item.description.th} /></label>
        <label>Quantity<input aria-label="Quantity" min="1" onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} step="1" type="number" value={item.quantity} /></label>
        <label>Unit price THB<input aria-label="Unit price THB" onChange={(event) => updateItem(index, { unitAmountThb: event.target.value })} step="0.01" type="number" value={item.unitAmountThb} /></label>
        <output>{formatThb(itemSnapshots[index]!.lineTotalSatang)}</output>
        {items.length > 1 && <button onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button">Remove item {index + 1}</button>}
      </fieldset>)}
      <button className={styles.addItem} onClick={() => setItems((current) => [...current, newAddition()])} type="button">Add quote item</button>
    </div>
    <div className={styles.fields}>
      <label>Deposit percent<input max="100" min="0" onChange={(event) => setDepositPercent(Number(event.target.value))} type="number" value={depositPercent} /></label>
      <label>Free revisions<input min="0" onChange={(event) => setFreeRevisions(Number(event.target.value))} type="number" value={freeRevisions} /></label>
      <label>Minimum duration days<input min="1" onChange={(event) => setDurationMinDays(Number(event.target.value))} type="number" value={durationMinDays} /></label>
      <label>Maximum duration days<input min="1" onChange={(event) => setDurationMaxDays(Number(event.target.value))} type="number" value={durationMaxDays} /></label>
      <label>Proposed deadline<input onChange={(event) => setProposedDeadline(event.target.value)} type="date" value={proposedDeadline} /></label>
      <label>Quote expiry<input onChange={(event) => setExpiresAt(event.target.value)} type="datetime-local" value={expiresAt} /></label>
      <label>Terms document slug<input onChange={(event) => setTermsSlug(event.target.value)} value={termsSlug} /></label>
      <label>Terms document version<input min="1" onChange={(event) => setTermsVersion(Number(event.target.value))} type="number" value={termsVersion} /></label>
    </div>
    <footer>
      <div><strong data-testid="quote-total-usd">Approx. USD {new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(approximateUsd)}</strong><small>Display estimate only; THB satang is authoritative.</small></div>
      {error && <p role="alert">{error}</p>}
      <button disabled={isSaving} onClick={sendQuote} type="button">{isSaving ? "Sending…" : "Save and send quote"}</button>
    </footer>
  </section>;
}

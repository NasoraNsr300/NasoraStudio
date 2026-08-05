import "server-only";

import type { LocalizedText } from "@/shared/types/public-content";

/** Private-shaped records cross the repository projection boundary and are never client-importable. */
export const privateQueueFixtureRecords: Array<{
  position: number;
  displayName: string;
  serviceName: LocalizedText;
  statusLabel: LocalizedText;
  deadlineLabel: string;
  quoteId: string;
  paymentId: string;
  messageId: string;
  contact: string;
  deliveryUrl: string;
}> = [
  { position: 1, displayName: "Mali", serviceName: { th: "Illustration Half Body", en: "Illustration Half Body" }, statusLabel: { th: "กำลังร่าง", en: "Sketching" }, deadlineLabel: "18 Aug 2026", quoteId: "quote-mali", paymentId: "payment-mali", messageId: "message-mali", contact: "mali@example.test", deliveryUrl: "https://private.example/delivery/mali" },
  { position: 2, displayName: "Nox", serviceName: { th: "Chibi Full Body", en: "Chibi Full Body" }, statusLabel: { th: "กำลังลงสี", en: "Coloring" }, deadlineLabel: "23 Aug 2026", quoteId: "quote-nox", paymentId: "payment-nox", messageId: "message-nox", contact: "nox@example.test", deliveryUrl: "https://private.example/delivery/nox" },
  { position: 3, displayName: "Guest Comet", serviceName: { th: "VTuber Reference", en: "VTuber Reference" }, statusLabel: { th: "รอคิว", en: "Queued" }, deadlineLabel: "2 Sep 2026", quoteId: "quote-comet", paymentId: "payment-comet", messageId: "message-comet", contact: "comet@example.test", deliveryUrl: "https://private.example/delivery/comet" },
];

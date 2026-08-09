import { createAdminPaymentRepository, type AdminPaymentClient } from "@/features/payments/data/admin-payment-repository.server";
import { AdminPaymentReview, type PendingPaymentReview } from "@/features/payments/components/admin-payment-review";
import { createR2SlipStorage, normalizeEtag } from "@/features/payments/storage/r2-slip-storage.server";
import { createClient } from "@/shared/supabase/server";

export default async function AdminPaymentsRoute() {
  const client = await createClient();
  const auth = await client.auth.getUser();
  if (auth.error || auth.data.user?.app_metadata?.role !== "admin" || auth.data.user.email?.toLowerCase() !== "nasora.nsr300@gmail.com") return <AdminPaymentReview payments={[]} />;

  let payments: PendingPaymentReview[] = [];
  try {
    const storage = createR2SlipStorage();
    const pending = await createAdminPaymentRepository(client as unknown as AdminPaymentClient).listPending({ limit: 25 });
    const validated: Array<PendingPaymentReview | null> = [];
    for (const payment of pending) {
      try {
        const actual = await storage.headObject(payment.objectKey);
        if (actual.contentType !== payment.contentType || actual.sizeBytes !== payment.sizeBytes || normalizeEtag(actual.etag) !== normalizeEtag(payment.etag)) { validated.push(null); continue; }
        validated.push({ amountSatang: payment.amountSatang, id: payment.id, kind: payment.kind, previewUrl: await storage.createPreviewUrl(payment.objectKey), requestId: payment.requestId, uploadedAt: payment.uploadedAt });
      } catch { validated.push(null); }
    }
    payments = validated.filter((payment): payment is PendingPaymentReview => payment !== null);
  } catch {
    // Missing private runtime configuration fails closed: no slips or object details are exposed.
  }
  return <AdminPaymentReview payments={payments} />;
}

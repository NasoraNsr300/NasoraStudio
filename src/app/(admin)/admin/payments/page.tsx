import { z } from "zod";

import { createAdminPaymentRepository, type AdminPaymentClient } from "@/features/payments/data/admin-payment-repository.server";
import { AdminPaymentReview, type PendingPaymentReview } from "@/features/payments/components/admin-payment-review";
import { createR2SlipStorage, normalizeEtag } from "@/features/payments/storage/r2-slip-storage.server";
import { createClient } from "@/shared/supabase/server";

export default async function AdminPaymentsRoute({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const client = await createClient();
  const auth = await client.auth.getUser();
  if (auth.error || auth.data.user?.app_metadata?.role !== "admin" || auth.data.user.email?.toLowerCase() !== "nasora.nsr300@gmail.com") return <AdminPaymentReview payments={[]} />;

  let payments: PendingPaymentReview[] = [];
  let loadError: string | undefined;
  let nextPageHref: string | undefined;
  try {
    const storage = createR2SlipStorage();
    const query = await searchParams;
    const beforeId = z.uuid().safeParse(typeof query?.beforeId === "string" ? query.beforeId : undefined);
    const beforeUploadedAtValue = typeof query?.beforeUploadedAt === "string" ? query.beforeUploadedAt : undefined;
    const beforeUploadedAt = beforeUploadedAtValue && Number.isFinite(Date.parse(beforeUploadedAtValue)) ? beforeUploadedAtValue : undefined;
    const before = beforeId.success && beforeUploadedAt ? { id: beforeId.data, uploadedAt: beforeUploadedAt } : undefined;
    const pending = await createAdminPaymentRepository(client as unknown as AdminPaymentClient).listPending({ before, limit: 26 });
    const page = pending.slice(0, 25);
    for (const payment of page) {
      try {
        const actual = await storage.headObject(payment.objectKey);
        if (actual.contentType !== payment.contentType || actual.sizeBytes !== payment.sizeBytes || normalizeEtag(actual.etag) !== normalizeEtag(payment.etag)) throw new Error("metadata_mismatch");
        payments.push({ amountSatang: payment.amountSatang, id: payment.id, kind: payment.kind, previewUrl: await storage.createPreviewUrl(payment.objectKey), requestId: payment.requestId, uploadedAt: payment.uploadedAt });
      } catch {
        payments.push({ amountSatang: payment.amountSatang, id: payment.id, kind: payment.kind, previewError: "ตรวจสอบไฟล์ไม่สำเร็จ — ต่ออายุหรือตัดสินใจปฏิเสธได้", previewUrl: null, requestId: payment.requestId, uploadedAt: payment.uploadedAt });
      }
    }
    if (pending.length > 25 && page.length) {
      const cursor = page[page.length - 1];
      nextPageHref = `/admin/payments?beforeUploadedAt=${encodeURIComponent(cursor.uploadedAt)}&beforeId=${encodeURIComponent(cursor.id)}`;
    }
  } catch {
    loadError = "ไม่สามารถโหลดรายการสลิปได้ กรุณาลองใหม่";
  }
  return <AdminPaymentReview loadError={loadError} nextPageHref={nextPageHref} payments={payments} />;
}

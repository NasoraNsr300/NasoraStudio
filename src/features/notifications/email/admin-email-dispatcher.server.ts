import "server-only";

import { z } from "zod";

import { createPaymentGatewayClient } from "@/features/payments/data/payment-gateway-client.server";

type Environment = Record<string, string | undefined>;
type Fetcher = typeof fetch;

const ADMIN_EMAIL = "nasora.nsr300@gmail.com";
const outboxRowSchema = z.object({
  attempts: z.number().int().min(1).max(5),
  event_type: z.enum(["new_estimate", "new_slip", "new_member_message", "delivery_expiry", "scheduled_failure"]),
  id: z.uuid(),
  payload: z.record(z.string(), z.unknown()),
  recipient: z.literal(ADMIN_EMAIL),
});

const subjects: Record<z.infer<typeof outboxRowSchema>["event_type"], string> = {
  delivery_expiry: "Nasora: ลิงก์ส่งงาน Google Drive ครบ 30 วัน",
  new_estimate: "Nasora: มีแบบประเมินราคาใหม่",
  new_member_message: "Nasora: มีข้อความใหม่จากสมาชิก",
  new_slip: "Nasora: มีสลิปรอตรวจสอบ",
  scheduled_failure: "Nasora: งานเบื้องหลังทำงานไม่สำเร็จ",
};

function required(environment: Environment, name: string) {
  const value = environment[name]?.trim();
  if (!value) throw new Error("admin_email_not_configured");
  return value;
}
function safeEntitySummary(payload: Record<string, unknown>) {
  const entries = Object.entries(payload).filter(([key, value]) => key.endsWith("_id") && typeof value === "string");
  return entries.length > 0 ? entries.map(([key, value]) => `${key}: ${value}`).join("\n") : "เปิดพื้นที่แอดมินเพื่อตรวจสอบรายละเอียด";
}

export async function dispatchAdminEmailBatch(environment: Environment = process.env, fetcher: Fetcher = fetch) {
  const apiKey = required(environment, "BREVO_API_KEY");
  const senderEmail = z.email().parse(required(environment, "ADMIN_EMAIL_SENDER"));
  const gateway = createPaymentGatewayClient(environment);
  const { data, error } = await gateway.rpc("claim_admin_email_batch", { p_limit: 10 });
  if (error) throw new Error("Unable to claim admin emails");
  const rows = z.array(outboxRowSchema).max(20).parse(data ?? []);
  let sent = 0; let failed = 0;

  for (const row of rows) {
    try {
      const response = await fetcher("https://api.brevo.com/v3/smtp/email", {
        body: JSON.stringify({
          sender: { email: senderEmail, name: "Nasora Studio" },
          subject: subjects[row.event_type],
          textContent: `${subjects[row.event_type]}\n\n${safeEntitySummary(row.payload)}\n\nเข้าสู่พื้นที่แอดมินของ Nasora เพื่อจัดการรายการนี้`,
          to: [{ email: ADMIN_EMAIL, name: "Nasora" }],
        }),
        headers: { "api-key": apiKey, "content-type": "application/json" },
        method: "POST",
      });
      if (!response.ok) throw new Error(`brevo_${response.status}`);
      await gateway.rpc("complete_admin_email", { p_error: null, p_id: row.id, p_sent: true });
      sent += 1;
    } catch (error) {
      await gateway.rpc("complete_admin_email", { p_error: error instanceof Error ? error.message : "email_failed", p_id: row.id, p_sent: false });
      failed += 1;
    }
  }
  return { failed, sent };
}

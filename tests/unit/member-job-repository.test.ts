import { describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/shared/supabase/server", () => supabase);

import { getMemberJob } from "@/features/member/data/member-job-repository.server";

describe("member job repository", () => {
  it("loads one owner-scoped member job without private notes or Guest identity", async () => {
    const row = {
      accepted_quote_id: "quote-1", category_name_snapshot: { en: "Chibi", th: "ชิบิ" }, commission_requests: { usage_type: "personal" }, deadline: "2026-09-01",
      default_free_revisions: 4, id: "job-1",
      job_status_history: [{ changed_at: "2026-08-10T01:00:00Z", id: "history-1", public_note: "Deposit verified", status_definitions: { label: { en: "Waiting", th: "รอเริ่มงาน" } } }],
      member_display_name_snapshot: "Mali", original_quote_total_satang: 140000,
      payments: [{ amount_satang: 70000 }], service_type_name_snapshot: { en: "Full Body", th: "เต็มตัว" },
      status_definitions: { label: { en: "Waiting", th: "รอเริ่มงาน" }, stable_key: "waiting" },
    };
    const query = { eq: vi.fn((_column: string, _value: string) => query), maybeSingle: vi.fn(async () => ({ data: row, error: null })), select: vi.fn((_columns: string) => query) };
    supabase.createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: "member-1" } } })) }, from: vi.fn(() => query) });
    const job = await getMemberJob("job-1", "en");
    const selection = query.select.mock.calls[0]?.[0] ?? "";
    expect(selection).not.toContain("private_note");
    expect(selection).not.toContain("guest_");
    expect(selection).toContain("commission_requests!request_id(usage_type)");
    expect(query.eq).toHaveBeenCalledWith("user_id", "member-1");
    expect(job).toEqual(expect.objectContaining({ id: "job-1", paidSatang: 70000, statusLabel: "Waiting" }));
  });
});

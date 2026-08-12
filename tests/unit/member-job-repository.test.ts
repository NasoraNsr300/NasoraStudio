import { describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/shared/supabase/server", () => supabase);

import { getMemberJob, listMemberJobs } from "@/features/member/data/member-job-repository.server";

describe("member job repository", () => {
  it("loads only customer-visible owner history without internal status fields", async () => {
    const row = {
      accepted_quote_id: "quote-1",
      category_name_snapshot: { en: "Chibi", th: "Chibi" },
      commission_requests: { id: "request-1", usage_type: "personal" },
      deadline: "2026-09-01",
      default_free_revisions: 4,
      id: "job-1",
      job_status_history: [{
        changed_at: "2026-08-10T01:00:00Z",
        id: "history-1",
        public_note: "Deposit verified",
        status_definitions: { customer_visible: true, label: { en: "Waiting", th: "Waiting" }, stable_key: "waiting" },
      }],
      member_display_name_snapshot: "Mali",
      original_quote_total_satang: 140000,
      payments: [{ amount_satang: 70000 }],
      service_type_name_snapshot: { en: "Full Body", th: "Full Body" },
    };
    const query = {
      eq: vi.fn((_column: string, _value: string) => query),
      maybeSingle: vi.fn(async () => ({ data: row, error: null })),
      select: vi.fn((_columns: string) => query),
    };
    supabase.createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "member-1" } } })) },
      from: vi.fn(() => query),
    });

    const job = await getMemberJob("job-1", "en");
    const selection = query.select.mock.calls[0]?.[0] ?? "";
    expect(selection).not.toContain("private_note");
    expect(selection).not.toContain("guest_");
    expect(selection).not.toContain("status_definitions!status_id");
    expect(selection).toContain("customer_visible");
    expect(selection).toContain("stable_key");
    expect(selection).toContain("commission_requests!request_id(id,usage_type)");
    expect(query.eq).toHaveBeenCalledWith("user_id", "member-1");
    expect(job).toEqual(expect.objectContaining({
      history: [expect.objectContaining({ changedAtLabel: "10 Aug 2026, 08:00" })],
      id: "job-1",
      paidSatang: 70000,
      statusKey: "waiting",
      statusLabel: "Waiting",
    }));
  });

  it("lists real member jobs with request and quote links", async () => {
    const row = {
      accepted_quote_id: "quote-1", category_name_snapshot: { en: "Chibi", th: "Chibi" },
      commission_requests: { id: "request-1", usage_type: "personal" }, deadline: null,
      default_free_revisions: 4, id: "job-1", member_display_name_snapshot: "Mali",
      original_quote_total_satang: 140000, quotes: { payments: [{ amount_satang: 70000 }] },
      service_type_name_snapshot: { en: "Full Body", th: "Full Body" },
      job_status_history: [{ changed_at: "2026-08-10T01:00:00Z", id: "history-1", public_note: null, status_definitions: { customer_visible: true, label: { en: "Waiting", th: "รอเริ่มงาน" }, stable_key: "waiting" } }],
    };
    const query = { eq: vi.fn((_c: string, _v: string) => query), order: vi.fn(async () => ({ data: [row], error: null })), select: vi.fn(() => query) };
    supabase.createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: "member-1" } } })) }, from: vi.fn(() => query) });

    await expect(listMemberJobs("en")).resolves.toEqual([expect.objectContaining({ id: "job-1", quoteId: "quote-1", requestId: "request-1", paidSatang: 70000 })]);
  });
});

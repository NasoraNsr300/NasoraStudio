import { describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/shared/supabase/server", () => supabase);

import { createManualGuestJob, listAdminJobs } from "@/features/admin/jobs/data/admin-job-repository.server";

function queryResult(data: unknown, error: { message?: string } | null = null) {
  const query = { order: vi.fn(async () => ({ data, error })), select: vi.fn(() => query) };
  return query;
}

describe("admin job repository", () => {
  it("lists real jobs with safe queue and status fields", async () => {
    const query = queryResult([{ id: "job-1", customer_type: "member", member_display_name_snapshot: "Mali", guest_display_name: null, service_type_name_snapshot: { en: "Full Body", th: "เต็มตัว" }, deadline: "2026-09-01", deposit_verified_at: "2026-08-10T01:00:00Z", status_definitions: { stable_key: "waiting", label: { en: "Waiting", th: "รอเริ่มงาน" } } }]);
    supabase.createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { app_metadata: { role: "admin" }, email: "nasora.nsr300@gmail.com" } } })) }, from: vi.fn(() => query) });
    const jobs = await listAdminJobs();
    expect(query.select).toHaveBeenCalledWith(expect.not.stringContaining("contact_snapshot"));
    expect(jobs).toEqual([expect.objectContaining({ customerDisplayName: "Mali", id: "job-1", statusKey: "waiting" })]);
  });

  it("rejects non-admin sessions before querying", async () => {
    const from = vi.fn();
    supabase.createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { app_metadata: { role: "member" }, email: "member@example.com" } } })) }, from });
    await expect(listAdminJobs()).rejects.toThrow("Admin access required");
    expect(from).not.toHaveBeenCalled();
  });

  it("keeps manual Guest creation as a separate admin-only RPC", async () => {
    const rpc = vi.fn(async () => ({ data: [{ job_id: "job-guest", queue_entry_id: "queue-guest" }], error: null }));
    supabase.createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { app_metadata: { role: "admin" }, email: "nasora.nsr300@gmail.com" } } })) }, rpc });
    const created = await createManualGuestJob({ displayName: "Guest Star", serviceName: { en: "Chibi", th: "ชิบิ" }, categoryName: { en: "Chibi", th: "ชิบิ" }, deadline: "2026-09-05", totalSatang: 120000 });
    expect(rpc).toHaveBeenCalledWith("admin_create_manual_guest_job", expect.objectContaining({ p_guest_display_name: "Guest Star" }));
    expect(created).toEqual({ jobId: "job-guest", queueEntryId: "queue-guest" });
  });
});

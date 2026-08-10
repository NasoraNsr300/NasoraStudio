import { describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/shared/supabase/server", () => supabase);

import { createManualGuestJob, listAdminJobs, updateAdminJobStatus } from "@/features/admin/jobs/data/admin-job-repository.server";

describe("admin job repository", () => {
  it("lists jobs through the guarded Admin RPC", async () => {
    const rpc = vi.fn(async () => ({
      data: [{
        customer_type: "member",
        deadline: "2026-09-01",
        deposit_verified_at: "2026-08-10T01:00:00Z",
        guest_display_name: null,
        id: "job-1",
        member_display_name_snapshot: "Mali",
        service_type_name_snapshot: { en: "Full Body", th: "Full Body" },
        status_key: "waiting",
        status_label: { en: "Waiting", th: "Waiting" },
      }],
      error: null,
    }));
    supabase.createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { app_metadata: { role: "admin" }, email: "nasora.nsr300@gmail.com" } } })) },
      rpc,
    });

    const jobs = await listAdminJobs();
    expect(rpc).toHaveBeenCalledWith("admin_list_jobs");
    expect(jobs).toEqual([expect.objectContaining({ customerDisplayName: "Mali", id: "job-1", statusKey: "waiting" })]);
  });

  it("changes a job status through the guarded Admin RPC", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    supabase.createClient.mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { app_metadata: { role: "admin" }, email: "nasora.nsr300@gmail.com" } } })) }, rpc });
    await updateAdminJobStatus({ jobId: "00000000-0000-4000-8000-000000000111", publicNote: "Sketch started", statusKey: "sketching" });
    expect(rpc).toHaveBeenCalledWith("admin_change_job_status", { p_job_id: "00000000-0000-4000-8000-000000000111", p_public_note: "Sketch started", p_status_key: "sketching" });
  });

  it("rejects non-admin sessions before querying", async () => {
    const rpc = vi.fn();
    supabase.createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { app_metadata: { role: "member" }, email: "member@example.com" } } })) },
      rpc,
    });
    await expect(listAdminJobs()).rejects.toThrow("Admin access required");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("keeps manual Guest creation as a separate admin-only RPC", async () => {
    const rpc = vi.fn(async () => ({ data: [{ job_id: "job-guest", queue_entry_id: "queue-guest" }], error: null }));
    supabase.createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { app_metadata: { role: "admin" }, email: "nasora.nsr300@gmail.com" } } })) },
      rpc,
    });
    const created = await createManualGuestJob({
      categoryName: { en: "Chibi", th: "Chibi" },
      deadline: "2026-09-05",
      displayName: "Guest Star",
      serviceName: { en: "Chibi", th: "Chibi" },
      totalSatang: 120000,
    });
    expect(rpc).toHaveBeenCalledWith("admin_create_manual_guest_job", expect.objectContaining({ p_guest_display_name: "Guest Star" }));
    expect(created).toEqual({ jobId: "job-guest", queueEntryId: "queue-guest" });
  });
});

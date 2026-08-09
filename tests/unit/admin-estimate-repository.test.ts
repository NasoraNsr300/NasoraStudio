import { describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/shared/supabase/server", () => supabase);

import { listAdminEstimateRequests } from "@/features/admin/estimates/data/admin-estimate-repository.server";

function queryResult(data: unknown) {
  const query = {
    eq: vi.fn(() => query),
    order: vi.fn(async () => ({ data, error: null })),
    select: vi.fn(() => query),
  };
  return query;
}

describe("listAdminEstimateRequests", () => {
  it("lists newest requests first and filters by status", async () => {
    const query = queryResult([{
      budget_max_satang: 450000,
      budget_min_satang: 300000,
      guest_display_name: null,
      id: "request-new",
      member_display_name_snapshot: "Mali",
      request_code: "REQ-ABCDEF1234",
      requester_type: "member",
      service_type_name_snapshot: { en: "Full Body", th: "เต็มตัว" },
      status: "submitted",
      submitted_at: "2026-08-09T10:00:00.000Z",
    }]);
    supabase.createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { app_metadata: { role: "admin" } } }, error: null })) },
      from: vi.fn(() => query),
    });

    const requests = await listAdminEstimateRequests({ status: "submitted" });

    expect(query.select).toHaveBeenCalledWith("id,request_code,requester_type,member_display_name_snapshot,guest_display_name,service_type_name_snapshot,budget_min_satang,budget_max_satang,submitted_at,status");
    expect(query.eq).toHaveBeenCalledWith("status", "submitted");
    expect(query.order).toHaveBeenCalledWith("submitted_at", { ascending: false });
    expect(requests).toEqual([expect.objectContaining({ customerDisplayName: "Mali", id: "request-new", status: "submitted" })]);
  });

  it("uses the submitted Guest display name without selecting contact details", async () => {
    const query = queryResult([{
      budget_max_satang: null,
      budget_min_satang: null,
      guest_display_name: "Guest Comet",
      id: "request-guest",
      member_display_name_snapshot: null,
      request_code: "REQ-1234567890",
      requester_type: "guest",
      service_type_name_snapshot: { en: "Chibi", th: "จิบิ" },
      status: "reviewing",
      submitted_at: "2026-08-08T10:00:00.000Z",
    }]);
    supabase.createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { app_metadata: { role: "admin" } } }, error: null })) },
      from: vi.fn(() => query),
    });

    const [request] = await listAdminEstimateRequests();

    expect(request).toMatchObject({ customerDisplayName: "Guest Comet", requesterType: "guest" });
    const selectedColumns = (query.select as unknown as { mock: { calls: Array<[string]> } }).mock.calls[0]?.[0] ?? "";
    expect(selectedColumns).not.toContain("guest_contact_snapshot");
    expect(selectedColumns).not.toContain("contact_snapshot");
  });

  it("rejects a session that is not an admin", async () => {
    supabase.createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { app_metadata: { role: "member" } } }, error: null })) },
      from: vi.fn(),
    });

    await expect(listAdminEstimateRequests()).rejects.toThrow("Admin access required");
  });
});

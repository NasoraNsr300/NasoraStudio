import { describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/shared/supabase/server", () => supabase);

import { listPublicQueue } from "@/features/queue/data/public-queue-repository.server";

describe("public queue repository", () => {
  it("reads only the safe public queue view and localizes snapshots", async () => {
    const order = vi.fn(async () => ({ data: [{ position: 1, customer_display_name: "Mali", service_type_name_snapshot: { th: "เต็มตัว", en: "Full Body" }, status_label_snapshot: { th: "รอเริ่มงาน", en: "Waiting" }, deadline: "2026-09-01" }], error: null }));
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));
    supabase.createClient.mockResolvedValue({ from });
    const rows = await listPublicQueue("en");
    expect(from).toHaveBeenCalledWith("public_queue");
    expect(select).toHaveBeenCalledWith("position,customer_display_name,service_type_name_snapshot,status_label_snapshot,deadline");
    expect(rows).toEqual([{ position: 1, displayName: "Mali", serviceName: "Full Body", statusLabel: "Waiting", deadlineLabel: "2026-09-01" }]);
  });
});

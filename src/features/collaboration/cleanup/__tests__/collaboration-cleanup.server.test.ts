import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn(); const deleteObject = vi.fn();
vi.mock("@/shared/supabase/service-role-client.server", () => ({ createServiceRoleClient: () => ({ rpc }) }));
vi.mock("@/features/collaboration/storage/r2-private-assets.server", () => ({ createR2PrivateAssetsStorage: () => ({ deleteObject }) }));

import { processCollaborationCleanup } from "../collaboration-cleanup.server";

beforeEach(() => { vi.clearAllMocks(); deleteObject.mockResolvedValue(undefined); });

describe("collaboration cleanup", () => {
  it("removes a superseded profile avatar and completes its task", async () => {
    rpc.mockResolvedValueOnce({ data: [{ delivery_kind: null, object_key: "member-avatars/00000000-0000-4000-8000-000000000202.webp", target_id: "00000000-0000-4000-8000-000000000202", target_type: "profile_avatar", task_id: "00000000-0000-4000-8000-000000000303" }], error: null }).mockResolvedValue({ data: null, error: null });
    await expect(processCollaborationCleanup({})).resolves.toEqual({ completed: 1, failed: 0 });
    expect(deleteObject).toHaveBeenCalledWith("member-avatars/00000000-0000-4000-8000-000000000202.webp");
    expect(rpc).toHaveBeenLastCalledWith("complete_cleanup_task", expect.objectContaining({ p_success: true }));
  });

  it("marks a failed deletion retryable", async () => {
    rpc.mockResolvedValueOnce({ data: [{ delivery_kind: null, object_key: "member-avatars/00000000-0000-4000-8000-000000000202.webp", target_id: "00000000-0000-4000-8000-000000000202", target_type: "profile_avatar", task_id: "00000000-0000-4000-8000-000000000303" }], error: null }).mockResolvedValue({ data: null, error: null });
    deleteObject.mockRejectedValue(new Error("r2 unavailable"));
    await expect(processCollaborationCleanup({})).resolves.toEqual({ completed: 0, failed: 1 });
    expect(rpc).toHaveBeenLastCalledWith("complete_cleanup_task", expect.objectContaining({ p_error: "r2 unavailable", p_success: false }));
  });
});

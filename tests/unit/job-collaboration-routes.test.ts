import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  createAdminDelivery: vi.fn(),
  postAdminJobMessage: vi.fn(),
  postAdminProgress: vi.fn(),
  postMemberJobMessage: vi.fn(),
}));
vi.mock("@/features/collaboration/data/collaboration-repository.server", () => repository);

import { POST as postAdminDelivery } from "@/app/api/admin/jobs/[jobId]/deliveries/route";
import { POST as postAdminMessage } from "@/app/api/admin/jobs/[jobId]/messages/route";
import { POST as postAdminProgress } from "@/app/api/admin/jobs/[jobId]/progress/route";
import { POST as postMemberMessage } from "@/app/api/member/jobs/[jobId]/messages/route";

const jobId = "00000000-0000-4000-8000-000000000111";
const context = { params: Promise.resolve({ jobId }) };
function json(url: string, body: unknown, origin = "http://localhost") {
  return new Request(url, { body: JSON.stringify(body), headers: { "content-type": "application/json", origin }, method: "POST" });
}

describe("job collaboration routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lets a member persist a bounded text message through the ownership repository", async () => {
    repository.postMemberJobMessage.mockResolvedValue({ id: "message-1" });
    const response = await postMemberMessage(json(`http://localhost/api/member/jobs/${jobId}/messages`, { body: "ขอตรวจภาพร่างค่ะ" }), context);
    expect(response.status).toBe(201);
    expect(repository.postMemberJobMessage).toHaveBeenCalledWith({ body: "ขอตรวจภาพร่างค่ะ", jobId });
  });

  it("rejects malformed and cross-origin admin mutations", async () => {
    const malformed = await postAdminMessage(json(`http://localhost/api/admin/jobs/${jobId}/messages`, { body: "" }), context);
    const crossOrigin = await postAdminProgress(json(`http://localhost/api/admin/jobs/${jobId}/progress`, { body: "ร่างแรก", title: "Sketch" }, "https://attacker.example"), context);
    expect(malformed.status).toBe(400);
    expect(crossOrigin.status).toBe(403);
    expect(repository.postAdminJobMessage).not.toHaveBeenCalled();
    expect(repository.postAdminProgress).not.toHaveBeenCalled();
  });

  it("creates a Drive delivery with a strict HTTPS URL", async () => {
    repository.createAdminDelivery.mockResolvedValue({ deliveryId: "delivery-1" });
    const response = await postAdminDelivery(json(`http://localhost/api/admin/jobs/${jobId}/deliveries`, { kind: "google_drive", url: "https://drive.google.com/file/d/demo/view" }), context);
    expect(response.status).toBe(201);
    expect(repository.createAdminDelivery).toHaveBeenCalledWith(expect.objectContaining({ jobId, kind: "google_drive" }));
  });
});

import { describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({ createManualGuestJob: vi.fn(), updateAdminJobStatus: vi.fn() }));
vi.mock("@/features/admin/jobs/data/admin-job-repository.server", () => repository);

import { POST as createJob } from "@/app/api/admin/jobs/route";
import { POST as updateStatus } from "@/app/api/admin/jobs/[jobId]/status/route";

function post(url: string, body: unknown, headers: HeadersInit = {}) {
  return new Request(url, { body: JSON.stringify(body), headers: { "content-type": "application/json", origin: new URL(url).origin, ...headers }, method: "POST" });
}

describe("Admin job mutation routes", () => {
  it("creates a Guest job from strict same-origin JSON", async () => {
    repository.createManualGuestJob.mockResolvedValue({ jobId: "job-1", queueEntryId: "queue-1" });
    const response = await createJob(post("http://localhost/api/admin/jobs", { deadline: null, displayName: "Guest Star", serviceName: "Chibi", totalThb: 1200 }));
    expect(response.status).toBe(201);
    expect(repository.createManualGuestJob).toHaveBeenCalledWith(expect.objectContaining({ displayName: "Guest Star", totalSatang: 120000 }));
  });

  it("rejects cross-origin and malformed status mutations before the repository", async () => {
    const jobId = "00000000-0000-4000-8000-000000000111";
    const crossOrigin = await updateStatus(post(`http://localhost/api/admin/jobs/${jobId}/status`, { publicNote: null, statusKey: "sketching" }, { origin: "https://attacker.example" }), { params: Promise.resolve({ jobId }) });
    const malformed = await updateStatus(post(`http://localhost/api/admin/jobs/${jobId}/status`, { statusKey: "not-real" }), { params: Promise.resolve({ jobId }) });
    expect(crossOrigin.status).toBe(403);
    expect(malformed.status).toBe(400);
    expect(repository.updateAdminJobStatus).not.toHaveBeenCalled();
  });
});

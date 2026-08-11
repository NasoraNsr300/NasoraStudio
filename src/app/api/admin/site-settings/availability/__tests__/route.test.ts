import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({ saveAdminCommissionAvailability: vi.fn() }));
const cache = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

vi.mock("@/features/site-settings/data/admin-site-settings-repository.server", () => repository);
vi.mock("next/cache", () => cache);

import { PATCH } from "@/app/api/admin/site-settings/availability/route";

function request(body: unknown, headers: HeadersInit = {}) {
  return new Request("http://localhost/api/admin/site-settings/availability", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", origin: "http://localhost", ...headers },
    method: "PATCH",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  repository.saveAdminCommissionAvailability.mockResolvedValue(false);
});

describe("Admin commission availability route", () => {
  it("persists one boolean and revalidates public surfaces", async () => {
    const response = await PATCH(request({ commissionsOpen: false }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ commissionsOpen: false });
    expect(repository.saveAdminCommissionAvailability).toHaveBeenCalledWith(false);
    expect(cache.revalidatePath).toHaveBeenCalledWith("/th/commission");
    expect(cache.revalidatePath).toHaveBeenCalledWith("/en/commission");
  });

  it("rejects unknown fields and cross-origin writes", async () => {
    expect((await PATCH(request({ commissionsOpen: false, unsafe: true }))).status).toBe(400);
    expect((await PATCH(request({ commissionsOpen: false }, { origin: "https://attacker.example" }))).status).toBe(403);
    expect(repository.saveAdminCommissionAvailability).not.toHaveBeenCalled();
  });
});

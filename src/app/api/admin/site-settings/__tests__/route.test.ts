import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({ saveAdminSiteSettings: vi.fn() }));
const cache = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

vi.mock("@/features/site-settings/data/admin-site-settings-repository.server", () => repository);
vi.mock("next/cache", () => cache);

import { POST } from "@/app/api/admin/site-settings/route";

const settings = {
  adminNote: "ตรวจคิว",
  businessHours: "11:00 – 22:00",
  commissionsOpen: true,
  discordContact: "nasora.studio",
  homeDescription: { en: "Stories", th: "เรื่องราว" },
  homeHeading: { en: "Draw your world", th: "รับวาดภาพในโลกของคุณ" },
  particlesEnabled: true,
  queueCapacity: 10,
  shootingStarsEnabled: true,
  updatedAt: "2026-08-12T00:00:00.000Z",
};

function request(body: unknown, headers: HeadersInit = {}) {
  return new Request("http://localhost/api/admin/site-settings", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", origin: "http://localhost", ...headers },
    method: "POST",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  repository.saveAdminSiteSettings.mockResolvedValue(settings);
});

describe("Admin site settings route", () => {
  it("saves strict settings and revalidates Admin and public surfaces", async () => {
    const response = await POST(request({ ...settings, updatedAt: undefined }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ settings });
    expect(repository.saveAdminSiteSettings).toHaveBeenCalledOnce();
    for (const path of ["/admin", "/admin/settings", "/th", "/en", "/th/commission", "/en/commission"]) {
      expect(cache.revalidatePath).toHaveBeenCalledWith(path);
    }
  });

  it("rejects cross-origin, non-exact JSON, and unknown fields", async () => {
    expect((await POST(request(settings, { origin: "https://attacker.example" }))).status).toBe(403);
    expect((await POST(request(settings, { "content-type": "application/json; charset=utf-8" }))).status).toBe(415);
    expect((await POST(request({ ...settings, unsafe: true }))).status).toBe(400);
    expect(repository.saveAdminSiteSettings).not.toHaveBeenCalled();
  });

  it("returns a safe authorization error", async () => {
    repository.saveAdminSiteSettings.mockRejectedValueOnce(new Error("Admin access required"));
    const response = await POST(request({ ...settings, updatedAt: undefined }));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Admin access required" });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  archiveAdminAlbum: vi.fn(),
  archiveAdminService: vi.fn(),
  replaceAdminServicePrices: vi.fn(),
  saveAdminAlbum: vi.fn(),
  saveAdminService: vi.fn(),
}));
const cache = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

vi.mock("@/features/admin/catalog/data/admin-catalog-repository.server", () => repository);
vi.mock("next/cache", () => cache);

import { POST as createAlbum } from "@/app/api/admin/catalog/albums/route";
import { PATCH as updateAlbum } from "@/app/api/admin/catalog/albums/[albumId]/route";
import { POST as archiveAlbum } from "@/app/api/admin/catalog/albums/[albumId]/archive/route";
import { POST as createService } from "@/app/api/admin/catalog/albums/[albumId]/services/route";
import { PATCH as updateService } from "@/app/api/admin/catalog/services/[serviceId]/route";
import { POST as archiveService } from "@/app/api/admin/catalog/services/[serviceId]/archive/route";
import { PUT as replacePrices } from "@/app/api/admin/catalog/services/[serviceId]/prices/route";

const albumId = "00000000-0000-4000-8000-000000000301";
const serviceId = "00000000-0000-4000-8000-000000000302";

const albumBody = {
  availability: "open",
  coverMediaId: null,
  description: { en: "Cute characters", th: "ตัวละครน่ารัก" },
  displayOrder: 1,
  name: { en: "Chibi", th: "Chibi" },
  published: true,
  recommended: true,
  slug: "chibi",
};

const serviceBody = {
  availability: "open",
  coverMediaId: null,
  description: { en: "Full body", th: "เต็มตัว" },
  displayOrder: 1,
  documentSlugs: ["commission-terms"],
  freeRevisionCount: 4,
  modifiers: [],
  name: { en: "Full Body", th: "Full Body" },
  published: true,
  slug: "full-body",
  timingGuidance: { en: "7 days", th: "7 วัน" },
};

function request(path: string, body: unknown, method = "POST", headers: HeadersInit = {}) {
  return new Request(`http://localhost${path}`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", origin: "http://localhost", ...headers },
    method,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  repository.saveAdminAlbum.mockResolvedValue(albumId);
  repository.saveAdminService.mockResolvedValue(serviceId);
  repository.archiveAdminAlbum.mockResolvedValue(undefined);
  repository.archiveAdminService.mockResolvedValue(undefined);
  repository.replaceAdminServicePrices.mockResolvedValue(undefined);
});

describe("Admin catalog routes", () => {
  it("creates a strict album and revalidates public catalog routes", async () => {
    const response = await createAlbum(request("/api/admin/catalog/albums", albumBody));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ albumId });
    expect(repository.saveAdminAlbum).toHaveBeenCalledWith({ ...albumBody, id: null });
    expect(cache.revalidatePath).toHaveBeenCalledWith("/th/commission");
    expect(cache.revalidatePath).toHaveBeenCalledWith("/en/commission");
  });

  it("rejects unknown fields, non-exact JSON, and cross-origin writes", async () => {
    const unknown = await createAlbum(request("/api/admin/catalog/albums", { ...albumBody, unsafe: true }));
    expect(unknown.status).toBe(400);
    const contentType = await createAlbum(request("/api/admin/catalog/albums", albumBody, "POST", { "content-type": "application/json; charset=utf-8" }));
    expect(contentType.status).toBe(415);
    const crossOrigin = await createAlbum(request("/api/admin/catalog/albums", albumBody, "POST", { origin: "https://attacker.example" }));
    expect(crossOrigin.status).toBe(403);
    expect(repository.saveAdminAlbum).not.toHaveBeenCalled();
  });

  it("updates only valid UUID albums and maps duplicate slugs to conflict", async () => {
    const invalid = await updateAlbum(request("/api/admin/catalog/albums/nope", albumBody, "PATCH"), { params: Promise.resolve({ albumId: "nope" }) });
    expect(invalid.status).toBe(400);
    repository.saveAdminAlbum.mockRejectedValueOnce(new Error("Catalog slug already exists"));
    const conflict = await updateAlbum(request(`/api/admin/catalog/albums/${albumId}`, albumBody, "PATCH"), { params: Promise.resolve({ albumId }) });
    expect(conflict.status).toBe(409);
  });

  it("archives and restores albums without deleting rows", async () => {
    const response = await archiveAlbum(request(`/api/admin/catalog/albums/${albumId}/archive`, { archived: true, reason: "Paused" }), { params: Promise.resolve({ albumId }) });
    expect(response.status).toBe(200);
    expect(repository.archiveAdminAlbum).toHaveBeenCalledWith({ albumId, archived: true, reason: "Paused" });
  });

  it("creates and updates nested services for the selected album", async () => {
    const created = await createService(request(`/api/admin/catalog/albums/${albumId}/services`, serviceBody), { params: Promise.resolve({ albumId }) });
    expect(created.status).toBe(201);
    expect(repository.saveAdminService).toHaveBeenCalledWith({ ...serviceBody, albumId, id: null });

    const updated = await updateService(request(`/api/admin/catalog/services/${serviceId}`, { ...serviceBody, albumId }, "PATCH"), { params: Promise.resolve({ serviceId }) });
    expect(updated.status).toBe(200);
    expect(repository.saveAdminService).toHaveBeenLastCalledWith({ ...serviceBody, albumId, id: serviceId });
  });

  it("archives nested services and replaces four exact price variants in satang", async () => {
    const archived = await archiveService(request(`/api/admin/catalog/services/${serviceId}/archive`, { archived: true, reason: null }), { params: Promise.resolve({ serviceId }) });
    expect(archived.status).toBe(200);

    const prices = [
      { amountSatang: 140000, displayOrder: 1, label: { en: "Personal Normal", th: "ส่วนตัว ปกติ" }, pace: "normal", usage: "personal" },
      { amountSatang: 182000, displayOrder: 2, label: { en: "Personal Rush", th: "ส่วนตัว เร่ง" }, pace: "rush", usage: "personal" },
      { amountSatang: 280000, displayOrder: 3, label: { en: "Commercial Normal", th: "เชิงพาณิชย์ ปกติ" }, pace: "normal", usage: "commercial" },
      { amountSatang: 364000, displayOrder: 4, label: { en: "Commercial Rush", th: "เชิงพาณิชย์ เร่ง" }, pace: "rush", usage: "commercial" },
    ];
    const response = await replacePrices(request(`/api/admin/catalog/services/${serviceId}/prices`, { prices }, "PUT"), { params: Promise.resolve({ serviceId }) });
    expect(response.status).toBe(200);
    expect(repository.replaceAdminServicePrices).toHaveBeenCalledWith(serviceId, prices);
  });

  it("returns safe authorization errors from the repository", async () => {
    repository.saveAdminAlbum.mockRejectedValueOnce(new Error("Admin access required"));
    const response = await createAlbum(request("/api/admin/catalog/albums", albumBody));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Admin access required" });
  });
});

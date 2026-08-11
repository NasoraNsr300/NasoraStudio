import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  archiveAdminPortfolioItem: vi.fn(),
  saveAdminPortfolioItem: vi.fn(),
}));
const cache = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

vi.mock("@/features/admin/portfolio/data/admin-portfolio-repository.server", () => repository);
vi.mock("next/cache", () => cache);

import { POST } from "@/app/api/admin/portfolio/items/route";
import { PATCH } from "@/app/api/admin/portfolio/items/[itemId]/route";
import { POST as archive } from "@/app/api/admin/portfolio/items/[itemId]/archive/route";

const itemId = "00000000-0000-4000-8000-000000000701";
const albumId = "00000000-0000-4000-8000-000000000702";
const mediaId = "00000000-0000-4000-8000-000000000703";
const body = {
  albumId,
  displayOrder: 2,
  featured: true,
  mediaId,
  published: true,
  showInHero: true,
  title: { en: "Star", th: "ดาว" },
};

function request(value: unknown, url = "http://localhost/api/admin/portfolio/items", headers: Record<string, string> = {}) {
  return new Request(url, {
    body: JSON.stringify(value),
    headers: { "content-type": "application/json", origin: "http://localhost", ...headers },
    method: "POST",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  repository.saveAdminPortfolioItem.mockResolvedValue(itemId);
  repository.archiveAdminPortfolioItem.mockResolvedValue(undefined);
});

describe("admin portfolio item routes", () => {
  it("creates and revalidates both public locales", async () => {
    const response = await POST(request(body));
    expect(response.status).toBe(201);
    expect(repository.saveAdminPortfolioItem).toHaveBeenCalledWith({ ...body, id: null });
    expect(cache.revalidatePath).toHaveBeenCalledWith("/th/portfolio");
    expect(cache.revalidatePath).toHaveBeenCalledWith("/en/portfolio");
  });

  it("rejects cross-origin and unknown body keys", async () => {
    const crossOrigin = request(body, undefined, { origin: "https://evil.example" });
    expect((await POST(crossOrigin)).status).toBe(403);
    expect((await POST(request({ ...body, injected: true }))).status).toBe(400);
    expect(repository.saveAdminPortfolioItem).not.toHaveBeenCalled();
  });

  it("updates only a valid UUID item", async () => {
    const patchRequest = new Request(`http://localhost/api/admin/portfolio/items/${itemId}`, {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json", origin: "http://localhost" },
      method: "PATCH",
    });
    expect((await PATCH(patchRequest, { params: Promise.resolve({ itemId }) })).status).toBe(200);
    expect(repository.saveAdminPortfolioItem).toHaveBeenCalledWith({ ...body, id: itemId });
    expect((await PATCH(patchRequest, { params: Promise.resolve({ itemId: "bad" }) })).status).toBe(400);
  });

  it("archives and restores through the guarded repository", async () => {
    const archiveRequest = request({ archived: true, reason: "hide" }, `http://localhost/api/admin/portfolio/items/${itemId}/archive`);
    const response = await archive(archiveRequest, { params: Promise.resolve({ itemId }) });
    expect(response.status).toBe(200);
    expect(repository.archiveAdminPortfolioItem).toHaveBeenCalledWith({ archived: true, itemId, reason: "hide" });
  });

  it("returns a safe denial without leaking repository errors", async () => {
    repository.saveAdminPortfolioItem.mockRejectedValue(new Error("Admin access required"));
    const response = await POST(request(body));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Admin access required" });
  });
});

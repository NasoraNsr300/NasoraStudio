import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  assertCatalogAdmin: vi.fn(),
  createAdminCatalogMedia: vi.fn(),
}));
const storage = vi.hoisted(() => ({ deleteObject: vi.fn(), putImage: vi.fn() }));

vi.mock("@/features/admin/catalog/data/admin-catalog-repository.server", () => repository);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/collaboration/storage/r2-private-assets.server", () => ({
  createR2PrivateAssetsStorage: () => storage,
  PRIVATE_ASSET_LIMITS: { imageBytes: 5 * 1024 * 1024 },
}));

import { POST } from "@/app/api/admin/catalog/media/route";

beforeEach(() => {
  vi.clearAllMocks();
  repository.assertCatalogAdmin.mockResolvedValue(undefined);
  repository.createAdminCatalogMedia.mockResolvedValue("00000000-0000-4000-8000-000000000801");
  storage.putImage.mockResolvedValue({ contentType: "image/png", etag: "etag-1" });
  storage.deleteObject.mockResolvedValue(undefined);
});

function request() {
  const values = new Map<string, unknown>([
    ["file", { arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer, size: 4, type: "image/png" }],
    ["altTh", "ภาพปก"], ["altEn", "Cover"], ["width", "1200"], ["height", "1500"],
  ]);
  return {
    formData: async () => ({ get: (key: string) => values.get(key) ?? null }) as FormData,
    headers: new Headers({ "content-type": "multipart/form-data; boundary=test", origin: "http://localhost" }),
    url: "http://localhost/api/admin/catalog/media",
  } as Request;
}

describe("admin catalog media upload", () => {
  it("checks sole-admin access before uploading and records private R2 metadata", async () => {
    const response = await POST(request());
    expect(response.status, JSON.stringify(await response.clone().json())).toBe(201);
    expect(repository.assertCatalogAdmin).toHaveBeenCalledBefore(storage.putImage);
    expect(storage.putImage).toHaveBeenCalledWith(expect.stringMatching(/^catalog-covers\//), expect.any(Uint8Array), "image/png");
    expect(repository.createAdminCatalogMedia).toHaveBeenCalledWith(expect.objectContaining({
      alt: { en: "Cover", th: "ภาพปก" }, contentType: "image/png", etag: "etag-1", height: 1500, width: 1200,
    }));
  });

  it("deletes the R2 object when database registration fails", async () => {
    repository.createAdminCatalogMedia.mockRejectedValue(new Error("db failed"));
    const response = await POST(request());
    expect(response.status).toBe(400);
    expect(storage.deleteObject).toHaveBeenCalledWith(expect.stringMatching(/^catalog-covers\//));
  });
});

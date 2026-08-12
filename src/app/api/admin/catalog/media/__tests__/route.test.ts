import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({ assertCatalogAdmin: vi.fn(), createAdminCatalogMedia: vi.fn() }));
const storage = vi.hoisted(() => ({ deleteObject: vi.fn(), headObject: vi.fn(), putImage: vi.fn() }));
vi.mock("@/features/admin/catalog/data/admin-catalog-repository.server", () => repository);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/collaboration/storage/r2-private-assets.server", () => ({ createR2PrivateAssetsStorage: () => storage }));
import { POST } from "@/app/api/admin/catalog/media/route";

const webp = new Uint8Array([82,73,70,70,22,0,0,0,87,69,66,80,86,80,56,88,10,0,0,0,0,0,0,0,175,4,0,219,5,0]);
beforeEach(() => { vi.clearAllMocks(); repository.assertCatalogAdmin.mockResolvedValue(undefined); repository.createAdminCatalogMedia.mockResolvedValue("00000000-0000-4000-8000-000000000801"); storage.putImage.mockResolvedValue({ contentType: "image/webp", etag: "etag-1" }); storage.headObject.mockResolvedValue({ contentType: "image/webp", etag: "etag-1", sizeBytes: webp.byteLength }); storage.deleteObject.mockResolvedValue(undefined); });
function request() { const values = new Map<string, unknown>([["file", { arrayBuffer: async () => webp.buffer, size: webp.byteLength, type: "image/webp" }], ["altTh", "ภาพปก"], ["altEn", "Cover"]]); return { formData: async () => ({ get: (key: string) => values.get(key) ?? null }) as FormData, headers: new Headers({ "content-type": "multipart/form-data; boundary=test", origin: "http://localhost" }), url: "http://localhost/api/admin/catalog/media" } as Request; }

describe("admin catalog media upload", () => {
  it("authorizes, verifies R2, and records inspected WebP metadata", async () => { const response = await POST(request()); expect(response.status).toBe(201); expect(repository.assertCatalogAdmin).toHaveBeenCalledBefore(storage.putImage); expect(storage.headObject).toHaveBeenCalledWith(expect.stringMatching(/^catalog-covers\/.*\.webp$/)); expect(repository.createAdminCatalogMedia).toHaveBeenCalledWith(expect.objectContaining({ alt: { en: "Cover", th: "ภาพปก" }, contentType: "image/webp", height: 1500, width: 1200 })); });
  it("deletes object when registration fails", async () => { repository.createAdminCatalogMedia.mockRejectedValue(new Error("db failed")); expect((await POST(request())).status).toBe(400); expect(storage.deleteObject).toHaveBeenCalledWith(expect.stringMatching(/^catalog-covers\//)); });
});

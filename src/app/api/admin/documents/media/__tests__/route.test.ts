import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({ createAdminDocumentMedia: vi.fn(), listAdminDocuments: vi.fn() }));
const storage = vi.hoisted(() => ({ deleteObject: vi.fn(), headObject: vi.fn(), putImage: vi.fn() }));
vi.mock("@/features/admin/documents/data/admin-documents-repository.server", () => repository);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/collaboration/storage/r2-private-assets.server", () => ({ createR2PrivateAssetsStorage: () => storage }));
import { POST } from "@/app/api/admin/documents/media/route";

const webp = new Uint8Array([82,73,70,70,22,0,0,0,87,69,66,80,86,80,56,88,10,0,0,0,0,0,0,0,63,6,0,131,3,0]);
beforeEach(() => { vi.clearAllMocks(); repository.listAdminDocuments.mockResolvedValue([]); repository.createAdminDocumentMedia.mockResolvedValue("00000000-0000-4000-8000-000000000731"); storage.putImage.mockResolvedValue({ contentType: "image/webp", etag: "etag" }); storage.headObject.mockResolvedValue({ contentType: "image/webp", etag: "etag", sizeBytes: webp.byteLength }); storage.deleteObject.mockResolvedValue(undefined); });
function request() { const values = new Map<string, unknown>([["file", { arrayBuffer: async () => webp.buffer, size: webp.byteLength, type: "image/webp" }], ["altTh", "ภาพปก"], ["altEn", "Cover"]]); return { formData: async () => ({ get: (key: string) => values.get(key) ?? null }) as FormData, headers: new Headers({ "content-type": "multipart/form-data; boundary=test", origin: "http://localhost" }), url: "http://localhost/api/admin/documents/media" } as Request; }

describe("admin document cover upload", () => {
  it("authorizes, verifies R2, and records inspected WebP metadata", async () => { const response = await POST(request()); expect(response.status).toBe(201); expect(repository.listAdminDocuments).toHaveBeenCalledBefore(storage.putImage); expect(storage.headObject).toHaveBeenCalledWith(expect.stringMatching(/^document-covers\/.*\.webp$/)); expect(repository.createAdminDocumentMedia).toHaveBeenCalledWith(expect.objectContaining({ alt: { en: "Cover", th: "ภาพปก" }, height: 900, width: 1600 })); });
  it("deletes object when registration fails", async () => { repository.createAdminDocumentMedia.mockRejectedValue(new Error("db")); expect((await POST(request())).status).toBe(400); expect(storage.deleteObject).toHaveBeenCalledWith(expect.stringMatching(/^document-covers\//)); });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({ createAdminDocumentMedia: vi.fn(), listAdminDocuments: vi.fn() }));
const storage = vi.hoisted(() => ({ deleteObject: vi.fn(), putImage: vi.fn() }));
vi.mock("@/features/admin/documents/data/admin-documents-repository.server", () => repository);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/collaboration/storage/r2-private-assets.server", () => ({ createR2PrivateAssetsStorage: () => storage, PRIVATE_ASSET_LIMITS: { imageBytes: 5 * 1024 * 1024 } }));

import { POST } from "@/app/api/admin/documents/media/route";

beforeEach(() => { vi.clearAllMocks(); repository.listAdminDocuments.mockResolvedValue([]); repository.createAdminDocumentMedia.mockResolvedValue("00000000-0000-4000-8000-000000000731"); storage.putImage.mockResolvedValue({ contentType: "image/png", etag: "etag" }); storage.deleteObject.mockResolvedValue(undefined); });
function request() { const values = new Map<string, unknown>([["file", { arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer, size: 4, type: "image/png" }], ["altTh", "ภาพปก"], ["altEn", "Cover"], ["width", "1600"], ["height", "900"]]); return { formData: async () => ({ get: (key: string) => values.get(key) ?? null }) as FormData, headers: new Headers({ "content-type": "multipart/form-data; boundary=test", origin: "http://localhost" }), url: "http://localhost/api/admin/documents/media" } as Request; }

describe("admin document cover upload", () => {
  it("authorizes, uploads under document-covers, and registers metadata", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(repository.listAdminDocuments).toHaveBeenCalledBefore(storage.putImage);
    expect(storage.putImage).toHaveBeenCalledWith(expect.stringMatching(/^document-covers\/[0-9a-f-]{36}\.png$/), expect.any(Uint8Array), "image/png");
    expect(repository.createAdminDocumentMedia).toHaveBeenCalledWith(expect.objectContaining({ alt: { en: "Cover", th: "ภาพปก" }, height: 900, width: 1600 }));
  });
  it("deletes uploaded bytes when metadata registration fails", async () => {
    repository.createAdminDocumentMedia.mockRejectedValue(new Error("db"));
    expect((await POST(request())).status).toBe(400);
    expect(storage.deleteObject).toHaveBeenCalledWith(expect.stringMatching(/^document-covers\//));
  });
});

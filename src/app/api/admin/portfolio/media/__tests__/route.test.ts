import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({ assertPortfolioAdmin: vi.fn(), createAdminPortfolioMedia: vi.fn() }));
const storage = vi.hoisted(() => ({ deleteObject: vi.fn(), headObject: vi.fn(), putImage: vi.fn() }));

vi.mock("@/features/admin/portfolio/data/admin-portfolio-repository.server", () => repository);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/collaboration/storage/r2-private-assets.server", () => ({ createR2PrivateAssetsStorage: () => storage }));

import { POST } from "@/app/api/admin/portfolio/media/route";

const webp = new Uint8Array([82,73,70,70,22,0,0,0,87,69,66,80,86,80,56,88,10,0,0,0,0,0,0,0,63,6,0,131,3,0]);

beforeEach(() => {
  vi.clearAllMocks();
  repository.assertPortfolioAdmin.mockResolvedValue(undefined);
  repository.createAdminPortfolioMedia.mockResolvedValue("00000000-0000-4000-8000-000000000801");
  storage.putImage.mockResolvedValue({ contentType: "image/webp", etag: "etag-1" });
  storage.headObject.mockResolvedValue({ contentType: "image/webp", etag: "etag-1", sizeBytes: webp.byteLength });
  storage.deleteObject.mockResolvedValue(undefined);
});

function request() {
  const values = new Map<string, unknown>([["file", { arrayBuffer: async () => webp.buffer, size: webp.byteLength, type: "image/webp" }], ["altTh", "ภาพผลงาน"], ["altEn", "Artwork"]]);
  return { formData: async () => ({ get: (key: string) => values.get(key) ?? null }) as FormData, headers: new Headers({ "content-type": "multipart/form-data; boundary=test", origin: "http://localhost" }), url: "http://localhost/api/admin/portfolio/media" } as Request;
}

describe("admin portfolio media upload", () => {
  it("authorizes, verifies R2, and records inspected WebP metadata", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(repository.assertPortfolioAdmin).toHaveBeenCalledBefore(storage.putImage);
    expect(storage.headObject).toHaveBeenCalledWith(expect.stringMatching(/^portfolio\/[0-9a-f-]{36}\.webp$/));
    expect(repository.createAdminPortfolioMedia).toHaveBeenCalledWith(expect.objectContaining({ alt: { en: "Artwork", th: "ภาพผลงาน" }, contentType: "image/webp", height: 900, width: 1600 }));
  });

  it("deletes object when registration fails", async () => {
    repository.createAdminPortfolioMedia.mockRejectedValue(new Error("db failed"));
    expect((await POST(request())).status).toBe(400);
    expect(storage.deleteObject).toHaveBeenCalledWith(expect.stringMatching(/^portfolio\//));
  });
});

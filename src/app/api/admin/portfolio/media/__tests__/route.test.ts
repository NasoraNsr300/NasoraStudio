import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  assertPortfolioAdmin: vi.fn(),
  createAdminPortfolioMedia: vi.fn(),
}));
const storage = vi.hoisted(() => ({ deleteObject: vi.fn(), putImage: vi.fn() }));

vi.mock("@/features/admin/portfolio/data/admin-portfolio-repository.server", () => repository);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/collaboration/storage/r2-private-assets.server", () => ({
  createR2PrivateAssetsStorage: () => storage,
  PRIVATE_ASSET_LIMITS: { imageBytes: 5 * 1024 * 1024 },
}));

import { POST } from "@/app/api/admin/portfolio/media/route";

beforeEach(() => {
  vi.clearAllMocks();
  repository.assertPortfolioAdmin.mockResolvedValue(undefined);
  repository.createAdminPortfolioMedia.mockResolvedValue("00000000-0000-4000-8000-000000000801");
  storage.putImage.mockResolvedValue({ contentType: "image/png", etag: "etag-1" });
  storage.deleteObject.mockResolvedValue(undefined);
});

function request() {
  const values = new Map<string, unknown>([
    ["file", { arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer, size: 4, type: "image/png" }],
    ["altTh", "à¸ à¸²à¸žà¸œà¸¥à¸‡à¸²à¸™"], ["altEn", "Artwork"], ["width", "1600"], ["height", "900"],
  ]);
  return {
    formData: async () => ({ get: (key: string) => values.get(key) ?? null }) as FormData,
    headers: new Headers({ "content-type": "multipart/form-data; boundary=test", origin: "http://localhost" }),
    url: "http://localhost/api/admin/portfolio/media",
  } as Request;
}

describe("admin portfolio media upload", () => {
  it("authorizes before uploading and registers private metadata", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(repository.assertPortfolioAdmin).toHaveBeenCalledBefore(storage.putImage);
    expect(storage.putImage).toHaveBeenCalledWith(expect.stringMatching(/^portfolio\/[0-9a-f-]{36}\.png$/), expect.any(Uint8Array), "image/png");
    expect(repository.createAdminPortfolioMedia).toHaveBeenCalledWith(expect.objectContaining({
      alt: { en: "Artwork", th: "à¸ à¸²à¸žà¸œà¸¥à¸‡à¸²à¸™" }, contentType: "image/png", height: 900, width: 1600,
    }));
  });

  it("deletes the object when registration fails", async () => {
    repository.createAdminPortfolioMedia.mockRejectedValue(new Error("db failed"));
    const response = await POST(request());
    expect(response.status).toBe(400);
    expect(storage.deleteObject).toHaveBeenCalledWith(expect.stringMatching(/^portfolio\//));
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({ getPublicCatalogMediaObject: vi.fn() }));
const storage = vi.hoisted(() => ({ getObject: vi.fn() }));
vi.mock("@/features/catalog/data/public-catalog-repository.server", () => repository);
vi.mock("@/features/collaboration/storage/r2-private-assets.server", () => ({ createR2PrivateAssetsStorage: () => storage }));

import { GET } from "@/app/api/catalog/media/[mediaId]/route";

beforeEach(() => {
  vi.clearAllMocks();
  repository.getPublicCatalogMediaObject.mockResolvedValue({ contentType: "image/webp", objectKey: "catalog-covers/cover.webp" });
  storage.getObject.mockResolvedValue({ body: new TextEncoder().encode("catalog-bytes"), contentType: "image/webp", etag: "etag", sizeBytes: 13 });
});

describe("public catalog media", () => {
  it("returns same-origin bytes only for media visible through catalog RLS", async () => {
    const response = await GET(new Request("http://localhost/api/catalog/media/00000000-0000-4000-8000-000000000801"), {
      params: Promise.resolve({ mediaId: "00000000-0000-4000-8000-000000000801" }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(await response.text()).toBe("catalog-bytes");
    expect(storage.getObject).toHaveBeenCalledWith("catalog-covers/cover.webp");
  });

  it("does not reveal missing or private unattached media", async () => {
    repository.getPublicCatalogMediaObject.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost/api/catalog/media/00000000-0000-4000-8000-000000000801"), {
      params: Promise.resolve({ mediaId: "00000000-0000-4000-8000-000000000801" }),
    });
    expect(response.status).toBe(404);
    expect(storage.getObject).not.toHaveBeenCalled();
  });
});

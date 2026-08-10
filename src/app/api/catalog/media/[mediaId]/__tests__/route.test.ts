import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({ getPublicCatalogMediaObject: vi.fn() }));
const storage = vi.hoisted(() => ({ createDownloadUrl: vi.fn() }));
vi.mock("@/features/catalog/data/public-catalog-repository.server", () => repository);
vi.mock("@/features/collaboration/storage/r2-private-assets.server", () => ({ createR2PrivateAssetsStorage: () => storage }));

import { GET } from "@/app/api/catalog/media/[mediaId]/route";

beforeEach(() => {
  vi.clearAllMocks();
  repository.getPublicCatalogMediaObject.mockResolvedValue({ contentType: "image/webp", objectKey: "catalog-covers/cover.webp" });
  storage.createDownloadUrl.mockResolvedValue("https://r2.example/signed");
});

describe("public catalog media", () => {
  it("returns a short-lived redirect only for media visible through catalog RLS", async () => {
    const response = await GET(new Request("http://localhost/api/catalog/media/00000000-0000-4000-8000-000000000801"), {
      params: Promise.resolve({ mediaId: "00000000-0000-4000-8000-000000000801" }),
    });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://r2.example/signed");
    expect(storage.createDownloadUrl).toHaveBeenCalledWith("catalog-covers/cover.webp");
  });

  it("does not reveal missing or private unattached media", async () => {
    repository.getPublicCatalogMediaObject.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost/api/catalog/media/00000000-0000-4000-8000-000000000801"), {
      params: Promise.resolve({ mediaId: "00000000-0000-4000-8000-000000000801" }),
    });
    expect(response.status).toBe(404);
    expect(storage.createDownloadUrl).not.toHaveBeenCalled();
  });
});

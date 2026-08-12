import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({ getPublicPortfolioMediaObject: vi.fn() }));
const storage = vi.hoisted(() => ({ getObject: vi.fn() }));
vi.mock("@/features/portfolio/data/public-portfolio-repository.server", () => repository);
vi.mock("@/features/collaboration/storage/r2-private-assets.server", () => ({ createR2PrivateAssetsStorage: () => storage }));

import { GET } from "@/app/api/portfolio/media/[mediaId]/route";

const mediaId = "00000000-0000-4000-8000-000000000901";

beforeEach(() => {
  vi.clearAllMocks();
  repository.getPublicPortfolioMediaObject.mockResolvedValue({ contentType: "image/webp", objectKey: `portfolio/${mediaId}.webp` });
  storage.getObject.mockResolvedValue({ body: new TextEncoder().encode("image-bytes"), contentType: "image/webp", etag: "etag", sizeBytes: 11 });
});

describe("public portfolio media", () => {
  it("streams visible bytes from the same-origin media endpoint", async () => {
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ mediaId }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toContain("immutable");
    expect(await response.text()).toBe("image-bytes");
    expect(storage.getObject).toHaveBeenCalledWith(`portfolio/${mediaId}.webp`);
  });

  it("returns 404 for invalid or invisible media", async () => {
    expect((await GET(new Request("http://localhost"), { params: Promise.resolve({ mediaId: "bad" }) })).status).toBe(404);
    repository.getPublicPortfolioMediaObject.mockResolvedValue(null);
    expect((await GET(new Request("http://localhost"), { params: Promise.resolve({ mediaId }) })).status).toBe(404);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({ getPublicPortfolioMediaObject: vi.fn() }));
const storage = vi.hoisted(() => ({ createDownloadUrl: vi.fn() }));
vi.mock("@/features/portfolio/data/public-portfolio-repository.server", () => repository);
vi.mock("@/features/collaboration/storage/r2-private-assets.server", () => ({ createR2PrivateAssetsStorage: () => storage }));

import { GET } from "@/app/api/portfolio/media/[mediaId]/route";

const mediaId = "00000000-0000-4000-8000-000000000901";

beforeEach(() => {
  vi.clearAllMocks();
  repository.getPublicPortfolioMediaObject.mockResolvedValue({ contentType: "image/webp", objectKey: `portfolio/${mediaId}.webp` });
  storage.createDownloadUrl.mockResolvedValue("https://r2.example/signed");
});

describe("public portfolio media", () => {
  it("redirects a visible attachment to a short-lived signed URL", async () => {
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ mediaId }) });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://r2.example/signed");
    expect(storage.createDownloadUrl).toHaveBeenCalledWith(`portfolio/${mediaId}.webp`);
  });

  it("returns 404 for invalid or invisible media", async () => {
    expect((await GET(new Request("http://localhost"), { params: Promise.resolve({ mediaId: "bad" }) })).status).toBe(404);
    repository.getPublicPortfolioMediaObject.mockResolvedValue(null);
    expect((await GET(new Request("http://localhost"), { params: Promise.resolve({ mediaId }) })).status).toBe(404);
  });
});

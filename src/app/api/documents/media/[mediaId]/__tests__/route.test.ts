import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({ getPublicDocumentCoverObject: vi.fn() }));
const storage = vi.hoisted(() => ({ createDownloadUrl: vi.fn() }));
vi.mock("@/features/documents/data/public-documents-repository.server", () => repository);
vi.mock("@/features/collaboration/storage/r2-private-assets.server", () => ({ createR2PrivateAssetsStorage: () => storage }));

import { GET } from "@/app/api/documents/media/[mediaId]/route";
const mediaId = "00000000-0000-4000-8000-000000000741";
beforeEach(() => { vi.clearAllMocks(); repository.getPublicDocumentCoverObject.mockResolvedValue({ contentType: "image/webp", objectKey: `document-covers/${mediaId}.webp` }); storage.createDownloadUrl.mockResolvedValue("https://r2.example/signed"); });
describe("public document cover", () => {
  it("redirects visible cover to a short-lived signed URL", async () => {
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ mediaId }) });
    expect(response.status).toBe(307); expect(response.headers.get("location")).toBe("https://r2.example/signed");
  });
  it("returns 404 for invalid and invisible cover", async () => {
    expect((await GET(new Request("http://localhost"), { params: Promise.resolve({ mediaId: "bad" }) })).status).toBe(404);
    repository.getPublicDocumentCoverObject.mockResolvedValue(null);
    expect((await GET(new Request("http://localhost"), { params: Promise.resolve({ mediaId }) })).status).toBe(404);
  });
});

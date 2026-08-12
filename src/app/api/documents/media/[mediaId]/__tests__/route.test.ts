import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({ getPublicDocumentCoverObject: vi.fn() }));
const storage = vi.hoisted(() => ({ getObject: vi.fn() }));
vi.mock("@/features/documents/data/public-documents-repository.server", () => repository);
vi.mock("@/features/collaboration/storage/r2-private-assets.server", () => ({ createR2PrivateAssetsStorage: () => storage }));

import { GET } from "@/app/api/documents/media/[mediaId]/route";
const mediaId = "00000000-0000-4000-8000-000000000741";
beforeEach(() => { vi.clearAllMocks(); repository.getPublicDocumentCoverObject.mockResolvedValue({ contentType: "image/webp", objectKey: `document-covers/${mediaId}.webp` }); storage.getObject.mockResolvedValue({ body: new TextEncoder().encode("document-bytes"), contentType: "image/webp", etag: "etag", sizeBytes: 14 }); });
describe("public document cover", () => {
  it("streams visible cover through the same origin", async () => {
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ mediaId }) });
    expect(response.status).toBe(200); expect(response.headers.get("content-type")).toBe("image/webp"); expect(await response.text()).toBe("document-bytes");
  });
  it("returns 404 for invalid and invisible cover", async () => {
    expect((await GET(new Request("http://localhost"), { params: Promise.resolve({ mediaId: "bad" }) })).status).toBe(404);
    repository.getPublicDocumentCoverObject.mockResolvedValue(null);
    expect((await GET(new Request("http://localhost"), { params: Promise.resolve({ mediaId }) })).status).toBe(404);
  });
});

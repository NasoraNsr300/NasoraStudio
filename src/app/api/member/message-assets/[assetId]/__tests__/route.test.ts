import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({ getMemberMessageAssetKey: vi.fn() }));
const storage = vi.hoisted(() => ({ getObject: vi.fn() }));
vi.mock("@/features/collaboration/data/collaboration-repository.server", () => repository);
vi.mock("@/features/collaboration/storage/r2-private-assets.server", () => ({ createR2PrivateAssetsStorage: () => storage }));

import { GET } from "@/app/api/member/message-assets/[assetId]/route";

const assetId = "00000000-0000-4000-8000-000000000911";

beforeEach(() => {
  vi.clearAllMocks();
  repository.getMemberMessageAssetKey.mockResolvedValue(`message-images/${assetId}.webp`);
  storage.getObject.mockResolvedValue({ body: new TextEncoder().encode("message-image"), contentType: "image/webp", etag: "etag", sizeBytes: 13 });
});

describe("member message image", () => {
  it("streams private image bytes through the same-origin endpoint", async () => {
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ assetId }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("location")).toBeNull();
    expect(await response.text()).toBe("message-image");
  });

  it("returns 404 when the asset cannot be resolved", async () => {
    repository.getMemberMessageAssetKey.mockResolvedValue(null);
    expect((await GET(new Request("http://localhost"), { params: Promise.resolve({ assetId }) })).status).toBe(404);
  });
});

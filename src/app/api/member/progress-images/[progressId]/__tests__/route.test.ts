import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({ getMemberProgressImageKey: vi.fn() }));
const storage = vi.hoisted(() => ({ getObject: vi.fn() }));
vi.mock("@/features/collaboration/data/collaboration-repository.server", () => repository);
vi.mock("@/features/collaboration/storage/r2-private-assets.server", () => ({ createR2PrivateAssetsStorage: () => storage }));

import { GET } from "@/app/api/member/progress-images/[progressId]/route";

const progressId = "00000000-0000-4000-8000-000000000912";

beforeEach(() => {
  vi.clearAllMocks();
  repository.getMemberProgressImageKey.mockResolvedValue(`progress-images/${progressId}.webp`);
  storage.getObject.mockResolvedValue({ body: new TextEncoder().encode("progress-image"), contentType: "image/webp", etag: "etag", sizeBytes: 14 });
});

describe("member progress image", () => {
  it("streams private image bytes through the same-origin endpoint", async () => {
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ progressId }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("location")).toBeNull();
    expect(await response.text()).toBe("progress-image");
  });
});

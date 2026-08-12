import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getObject: vi.fn(),
  getMemberDeliveryDownload: vi.fn(),
}));

vi.mock("@/features/collaboration/data/collaboration-repository.server", () => ({
  getMemberDeliveryDownload: mocks.getMemberDeliveryDownload,
}));
vi.mock("@/features/collaboration/storage/r2-private-assets.server", () => ({
  createR2PrivateAssetsStorage: () => ({ getObject: mocks.getObject }),
}));

import { GET } from "@/app/api/member/deliveries/[deliveryId]/download/route";

describe("member delivery download route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("streams an owned R2 delivery as an attachment", async () => {
    mocks.getMemberDeliveryDownload.mockResolvedValue({ external_url: null, id: "delivery-1", kind: "r2_file", object_key: "deliveries/job-1/00000000-0000-4000-8000-000000000111-final-art.zip" });
    mocks.getObject.mockResolvedValue({ body: new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode("file")); controller.close(); } }), contentType: "application/zip", etag: "etag-1", sizeBytes: 4 });

    const response = await GET(new Request("http://localhost/api/member/deliveries/delivery-1/download"), { params: Promise.resolve({ deliveryId: "delivery-1" }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain('filename="final-art.zip"');
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(await response.text()).toBe("file");
    expect(mocks.getObject).toHaveBeenCalledWith("deliveries/job-1/00000000-0000-4000-8000-000000000111-final-art.zip");
  });

  it("redirects an owned Google Drive delivery without exposing it in the member query", async () => {
    mocks.getMemberDeliveryDownload.mockResolvedValue({ external_url: "https://drive.google.com/file/d/demo/view", id: "delivery-2", kind: "google_drive", object_key: null });

    const response = await GET(new Request("http://localhost/api/member/deliveries/delivery-2/download"), { params: Promise.resolve({ deliveryId: "delivery-2" }) });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://drive.google.com/file/d/demo/view");
    expect(mocks.getObject).not.toHaveBeenCalled();
  });
});

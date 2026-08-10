import { describe, expect, it, vi } from "vitest";

import { createR2SlipStorage, normalizeEtag } from "@/features/payments/storage/r2-slip-storage.server";

const environment = {
  R2_ACCESS_KEY_ID: "test-access-key",
  R2_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
  R2_PAYMENT_SLIPS_BUCKET: "private-slips",
  R2_SECRET_ACCESS_KEY: "test-secret-key",
};
const objectKey = "payment-slips/025f6aa2-6227-4b74-a833-e9fca9db998a.png";
const fixedNow = () => new Date("2026-08-10T03:04:05.000Z");

describe("R2 payment slip storage", () => {
  it("creates deterministic, short-lived method-specific SigV4 URLs", async () => {
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => new Response(null, {
      headers: init?.method === "HEAD" ? { "content-length": "20", "content-type": "image/png", etag: '"etag-head"' } : { etag: '"etag-put"' },
      status: 200,
    }));
    const storage = createR2SlipStorage(environment, fetcher as typeof fetch, fixedNow);
    const preview = await storage.createPreviewUrl(objectKey);
    await storage.putObject(objectKey, new Uint8Array(20), "image/png");
    await storage.headObject(objectKey);
    await storage.deleteObject(objectKey);

    expect(preview).toBe("https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com/private-slips/payment-slips/025f6aa2-6227-4b74-a833-e9fca9db998a.png?X-Amz-Expires=180&X-Amz-Date=20260810T030405Z&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=test-access-key%2F20260810%2Fauto%2Fs3%2Faws4_request&X-Amz-SignedHeaders=host&X-Amz-Signature=682e828e8ce8118fd08fe7ded23b9aebe36ddd2286d4d78c36e408be889003c4");
    expect(preview).toContain("X-Amz-Expires=180");
    expect(preview).toMatch(/X-Amz-Signature=[0-9a-f]{64}/);
    const calls = fetcher.mock.calls as unknown as Array<[string, RequestInit]>;
    expect(calls.map(([, init]) => init.method)).toEqual(["PUT", "HEAD", "DELETE"]);
    expect(calls[0][0]).toContain("X-Amz-Expires=120");
    expect(calls[0][0]).toContain("X-Amz-SignedHeaders=host");
    expect(calls[0][1].headers).toEqual({ "content-type": "image/png" });
    expect(calls[1][0]).toContain("X-Amz-Expires=120");
    expect(calls[2][0]).toContain("X-Amz-Expires=60");
    expect(new Set([preview, ...calls.map(([url]) => url)].map((url) => new URL(url).searchParams.get("X-Amz-Signature"))).size).toBe(4);
  });

  it("requires a non-empty normalized ETag from PUT and HEAD", async () => {
    expect(normalizeEtag(' W/"opaque-tag" ')).toBe("W/opaque-tag");
    expect(normalizeEtag('"opaque-tag"')).toBe("opaque-tag");
    expect(normalizeEtag('W/"opaque-tag"')).not.toBe(normalizeEtag('"opaque-tag"'));
    const fetcher = vi.fn(async () => new Response(null, { status: 200 }));
    const storage = createR2SlipStorage(environment, fetcher as typeof fetch, fixedNow);
    await expect(storage.putObject(objectKey, new Uint8Array(20), "image/png")).rejects.toThrow("invalid_r2_object_metadata");
  });
});

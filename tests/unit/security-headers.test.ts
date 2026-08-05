import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("public security headers", () => {
  it("sets framing, sniffing, referrer, and CSP protections on every route", async () => {
    const rules = await nextConfig.headers?.();
    const headers = new Map(rules?.find((rule) => rule.source === "/:path*")?.headers.map((header) => [header.key, header.value]));

    expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });
});

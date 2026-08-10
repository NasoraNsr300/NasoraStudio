import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Cloudflare deploy readiness", () => {
  it("uses Edge middleware instead of unsupported Node proxy", () => {
    expect(existsSync("src/proxy.ts")).toBe(false);
    const middleware = readFileSync("src/middleware.ts", "utf8");
    expect(middleware).toMatch(/export async function middleware/);
    expect(middleware).not.toMatch(/runtime\s*:\s*["']nodejs["']/);
  });

  it("targets Workers with OpenNext and node compatibility", () => {
    const wrangler = readFileSync("wrangler.jsonc", "utf8");
    expect(wrangler).toContain('"main": ".open-next/worker.js"');
    expect(wrangler).toContain('"nodejs_compat"');
    expect(wrangler).toMatch(/"observability"\s*:\s*\{\s*"enabled"\s*:\s*true/);
    expect(readFileSync("open-next.config.ts", "utf8")).toContain("defineCloudflareConfig");
  });

  it("ships a separate scheduled maintenance Worker without embedding secrets", () => {
    const config = readFileSync("wrangler.maintenance.jsonc", "utf8");
    const worker = readFileSync("workers/nasora-maintenance.ts", "utf8");
    expect(config).toContain('"*/5 * * * *"');
    expect(worker).toContain('/api/internal/email-outbox/dispatch');
    expect(worker).toContain('/api/internal/cleanup/dispatch');
    expect(worker).toContain("environment.CRON_SECRET");
    expect(config).not.toMatch(/CRON_SECRET|NASORA_BASE_URL/);
  });
});

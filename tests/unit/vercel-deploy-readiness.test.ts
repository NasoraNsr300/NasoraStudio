import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Vercel deployment readiness", () => {
  it("uses the guarded Next.js build in Singapore with protected maintenance schedules", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      buildCommand: string;
      crons: Array<{ path: string; schedule: string }>;
      framework: string;
      installCommand: string;
      regions: string[];
    };

    expect(config).toMatchObject({
      buildCommand: "npm run build",
      framework: "nextjs",
      installCommand: "npm ci",
      regions: ["sin1"],
    });
    expect(config.crons).toEqual([
      { path: "/api/internal/email-outbox/dispatch", schedule: "*/5 * * * *" },
      { path: "/api/internal/cleanup/dispatch", schedule: "*/5 * * * *" },
    ]);
  });

  it("uses the Next.js 16 proxy convention without a legacy middleware file", () => {
    expect(readFileSync("src/proxy.ts", "utf8")).toContain("export async function proxy");
    expect(() => readFileSync("src/middleware.ts", "utf8")).toThrow();
  });

  it("keeps server and test values out of the production build environment", () => {
    const guard = readFileSync("scripts/run-safe-production-build.mjs", "utf8");
    const vercelBuild = readFileSync("scripts/build-vercel.mjs", "utf8");

    for (const key of [
      "SUPABASE_SECRET_KEY",
      "R2_SECRET_ACCESS_KEY",
      "RESEND_API_KEY",
      "CRON_SECRET",
      "TEST_CUSTOMER_PASSWORD",
    ]) {
      expect(guard).toContain(`\"${key}\"`);
    }
    expect(vercelBuild).toContain("Missing Vercel environment variables");
    expect(vercelBuild).toContain("ADMIN_EMAIL_SENDER must contain an email address only");
  });
});

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Stage 1 final review contracts", () => {
  it("renders meaningful Queue and Documents static fallbacks", () => {
    const queueRoute = source("src/app/[locale]/queue/page.tsx");
    const documentsRoute = source("src/app/[locale]/documents/page.tsx");

    expect(queueRoute).not.toContain("fallback={null}");
    expect(queueRoute).toMatch(/fallback=\{<QueuePage[^>]+initialQuery=""/);
    expect(documentsRoute).not.toContain("fallback={null}");
    expect(documentsRoute).toMatch(/fallback=\{<DocumentCenterPage[^>]+initialQuery=""/);
  });

  it("keeps private queue fixtures in a server-only module outside client-safe public fixtures", () => {
    const publicFixtures = source("src/data/fixtures/public-content.ts");
    const privateFixturePath = "src/data/fixtures/private-queue-fixtures.server.ts";

    expect(publicFixtures).not.toContain("privateQueueFixtureRecords");
    expect(existsSync(join(process.cwd(), privateFixturePath))).toBe(true);
    expect(source(privateFixturePath)).toContain('import "server-only"');
  });

  it("keeps client-safe pricing guidance separate from fixture repository data", () => {
    const serviceCard = source("src/features/commission/components/service-card.tsx");
    const detailDialog = source("src/features/commission/components/service-detail-dialog.tsx");

    expect(serviceCard).toContain("@/features/commission/lib/pricing-guidance");
    expect(detailDialog).toContain("@/features/commission/lib/pricing-guidance");
    expect(serviceCard).not.toContain("@/data/fixtures");
    expect(detailDialog).not.toContain("@/data/fixtures");
  });

  it("gives About a feature-owned stylesheet", () => {
    const aboutPage = source("src/features/about/components/about-page.tsx");
    expect(aboutPage).toContain('./about.module.css');
    expect(aboutPage).not.toContain("features/documents");
  });
});

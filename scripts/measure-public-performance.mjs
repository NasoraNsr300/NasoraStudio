import { chromium } from "@playwright/test";

const baseURL = (process.env.PERF_BASE_URL ?? "http://localhost:3100").replace(/\/$/, "");
const routes = ["/en", "/en/portfolio"];
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "phone", width: 390, height: 844 },
];

const browser = await chromium.launch();
const results = [];

try {
  for (const viewport of viewports) {
    for (const path of routes) {
      const context = await browser.newContext({
        reducedMotion: "reduce",
        viewport: { height: viewport.height, width: viewport.width },
      });
      const page = await context.newPage();
      await page.addInitScript(() => {
        window.__nasoraVitals = { cls: 0, lcp: 0 };
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          window.__nasoraVitals.lcp = entries.at(-1)?.startTime ?? 0;
        }).observe({ buffered: true, type: "largest-contentful-paint" });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) window.__nasoraVitals.cls += entry.value;
          }
        }).observe({ buffered: true, type: "layout-shift" });
      });

      const response = await page.goto(`${baseURL}${path}`, { waitUntil: "networkidle" });
      if (!response?.ok()) throw new Error(`${path} returned HTTP ${response?.status() ?? "unknown"}`);
      await page.waitForTimeout(1_000);
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType("navigation")[0];
        const resources = performance.getEntriesByType("resource");
        return {
          cls: window.__nasoraVitals.cls,
          decodedBodyBytes: resources.reduce((sum, entry) => sum + (entry.decodedBodySize || 0), 0),
          domContentLoaded: navigation.domContentLoadedEventEnd,
          lcp: window.__nasoraVitals.lcp,
          requestCount: resources.length,
          transferBytes: resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
        };
      });
      results.push({ path, viewport: viewport.name, ...metrics });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);

for (const result of results) {
  if (result.cls > 0.1) throw new Error(`${result.viewport} ${result.path} CLS ${result.cls.toFixed(3)} exceeds 0.1`);
  if (result.lcp > 2_500) throw new Error(`${result.viewport} ${result.path} LCP ${Math.round(result.lcp)}ms exceeds 2500ms`);
}

import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

const routes = [
  { name: "home", path: "/en" },
  { name: "portfolio", path: "/en/portfolio" },
  { name: "commission-albums", path: "/en/commission" },
  { name: "queue", path: "/en/queue" },
  { name: "documents", path: "/en/documents" },
] as const;

const screenshotStylePath = path.join(process.cwd(), "tests/e2e/visual-regression.css");

async function prepareVisualPage(page: Page, pathname: string, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    window.localStorage.setItem("nasora-theme", "night");
    Object.defineProperty(Crypto.prototype, "getRandomValues", {
      configurable: true,
      value<T extends ArrayBufferView | null>(array: T): T {
        if (array && "length" in array && typeof array.length === "number") {
          for (let index = 0; index < array.length; index += 1) {
            (array as unknown as number[])[index] = 0;
          }
        }
        return array;
      },
    });
  });
  await page.goto(pathname);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
}

for (const viewport of viewports) {
  for (const route of routes) {
    test(`${route.name} matches ${viewport.name} baseline`, async ({ page }) => {
      await prepareVisualPage(page, route.path, viewport.width, viewport.height);
      await expect(page).toHaveScreenshot(`${route.name}-${viewport.width}x${viewport.height}.png`, {
        animations: "disabled",
        caret: "initial",
        fullPage: false,
        stylePath: screenshotStylePath,
      });
    });
  }

  test(`service details matches ${viewport.name} baseline`, async ({ page }) => {
    await prepareVisualPage(page, "/en/commission/illustration", viewport.width, viewport.height);
    await page.getByRole("button", { name: /View details for Illustration Half Body/ }).click();
    await expect(page.getByRole("dialog", { name: "Illustration Half Body" })).toBeVisible();
    await expect(page).toHaveScreenshot(`service-details-${viewport.width}x${viewport.height}.png`, {
      animations: "disabled",
      caret: "initial",
      fullPage: false,
      stylePath: screenshotStylePath,
    });
  });
}

test("Home, Portfolio, and Commission keep independent composite component boundaries", () => {
  const componentRoots = {
    commission: path.join(process.cwd(), "src/features/commission/components"),
    home: path.join(process.cwd(), "src/features/home/components"),
    portfolio: path.join(process.cwd(), "src/features/portfolio/components"),
  };
  const forbiddenImports = {
    commission: ["@/features/home/components", "@/features/portfolio/components"],
    home: ["@/features/commission/components", "@/features/portfolio/components"],
    portfolio: ["@/features/commission/components", "@/features/home/components"],
  };

  for (const [feature, root] of Object.entries(componentRoots)) {
    const source = fs.readdirSync(root)
      .filter((file) => file.endsWith(".tsx"))
      .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
      .join("\n");
    for (const forbiddenImport of forbiddenImports[feature as keyof typeof forbiddenImports]) {
      expect(source, `${feature} must not import ${forbiddenImport}`).not.toContain(forbiddenImport);
    }
  }
});

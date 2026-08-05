import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";
import ts from "typescript";

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

test("snapshot paths are platform-neutral", async ({}, testInfo) => {
  expect(path.basename(testInfo.snapshotPath("probe.png"))).toBe("probe.png");
});

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

function sourceFilesUnder(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) return sourceFilesUnder(entryPath);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts") ? [entryPath] : [];
  });
}

function resolveSourceImport(importer: string, specifier: string, sourceRoot: string): string | undefined {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return undefined;
  const unresolved = specifier.startsWith("@/")
    ? path.join(sourceRoot, specifier.slice(2))
    : path.resolve(path.dirname(importer), specifier);
  const candidates = [
    unresolved,
    `${unresolved}.ts`,
    `${unresolved}.tsx`,
    path.join(unresolved, "index.ts"),
    path.join(unresolved, "index.tsx"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}

function importedSourceFiles(file: string, sourceRoot: string): string[] {
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const specifiers: string[] = [];
  source.forEachChild((node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && ts.isStringLiteral(node.moduleReference.expression)) {
      specifiers.push(node.moduleReference.expression.text);
    }
  });
  return specifiers.flatMap((specifier) => resolveSourceImport(file, specifier, sourceRoot) ?? []);
}

function isInside(file: string, root: string): boolean {
  const relative = path.relative(root, file);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

test("Home, Portfolio, and Commission keep independent recursive dependency graphs", () => {
  const sourceRoot = path.join(process.cwd(), "src");
  const featureRoots = {
    commission: path.join(sourceRoot, "features/commission"),
    home: path.join(sourceRoot, "features/home"),
    portfolio: path.join(sourceRoot, "features/portfolio"),
  };

  for (const [feature, root] of Object.entries(featureRoots)) {
    const pending = [...sourceFilesUnder(root)];
    const visited = new Set<string>();
    while (pending.length > 0) {
      const current = pending.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);

      for (const [otherFeature, otherRoot] of Object.entries(featureRoots)) {
        if (otherFeature !== feature) {
          expect(isInside(current, otherRoot), `${feature} dependency graph reaches ${otherFeature} via ${path.relative(sourceRoot, current)}`).toBe(false);
        }
      }
      pending.push(...importedSourceFiles(current, sourceRoot));
    }
  }
});

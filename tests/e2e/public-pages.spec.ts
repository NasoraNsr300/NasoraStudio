import { expect, test, type Page } from "@playwright/test";

const publicRoutes = [
  "/en",
  "/en/portfolio",
  "/en/commission",
  "/en/commission/illustration",
  "/en/queue",
  "/en/documents",
  "/en/documents/commission-terms",
] as const;

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

async function expectMinimumTouchTargets(page: Page, state: string) {
  const undersized = await page.locator("a[href]:visible, button:visible, input:visible, select:visible, textarea:visible, [role='button']:visible, [role='tab']:visible").evaluateAll((elements) =>
    Array.from(new Set(elements)).flatMap((element) => {
      if (element.closest("nextjs-portal") || element.getAttribute("aria-label") === "Open Next.js Dev Tools") return [];
      const box = element.getBoundingClientRect();
      return box.width < 44 || box.height < 44
        ? [`${element.tagName.toLowerCase()}[${element.getAttribute("aria-label") ?? element.textContent?.trim() ?? ""}] ${Math.round(box.width)}x${Math.round(box.height)}`]
        : [];
    }),
  );
  expect(undersized, `undersized targets in ${state}`).toEqual([]);
}

test("visitor can browse the public commission journey", async ({ page }) => {
  await page.goto("/th");
  await page.getByRole("button", { name: "เปิดเมนู" }).click();
  await page.getByRole("link", { name: "คอมมิชชัน", exact: true }).click();
  await page.getByRole("link", { name: /Illustration/ }).click();
  await page.getByRole("button", { name: /ดูรายละเอียด Illustration Half Body/ }).click();
  await expect(page.getByRole("dialog", { name: /Illustration Half Body/ })).toBeVisible();
});

test("public queue exposes useful public progress without private fields", async ({ page }) => {
  await page.goto("/en/queue");

  await expect(page.getByRole("heading", { name: "Queue" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Mali" })).toBeVisible();
  await expect(page.getByText("Sketching", { exact: true })).toBeVisible();
  await expect(page.getByText(/quote-mali|payment-mali|mali@example\.test/)).toHaveCount(0);
});

test("published document direct route renders route content", async ({ page }) => {
  await page.goto("/en/documents/commission-terms");

  await expect(page).toHaveURL(/\/en\/documents\/commission-terms$/);
  await expect(page.getByRole("heading", { name: "Commission Terms" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to documents" })).toBeVisible();
});

test("service album eagerly loads its above-fold LCP image", async ({ page }) => {
  await page.goto("/en/commission/illustration");
  await expect(page.getByRole("heading", { name: "Illustration", exact: true })).toBeVisible();
  await expect(page.locator("main article img").first()).toHaveAttribute("loading", "eager");
});

test("commission album grid eagerly loads only its true LCP item", async ({ page }) => {
  await page.goto("/en/commission");
  const albumImages = page.locator("main a img");

  await expect(albumImages).toHaveCount(5);
  await expect(albumImages.first()).toHaveAttribute("loading", "eager");
  for (let index = 1; index < 5; index += 1) {
    await expect(albumImages.nth(index)).toHaveAttribute("loading", "lazy");
  }
});

test("mobile service dialog controls stay above floating shell controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/commission/illustration");
  await page.getByRole("button", { name: /View details for Illustration Half Body/ }).click();

  const dialog = page.getByRole("dialog", { name: "Illustration Half Body" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close service details" }).click({ trial: true });
  await dialog.getByRole("button", { name: "Close", exact: true }).click({ trial: true });
});

for (const route of publicRoutes) {
  test(`${route} has no footer or navbar login control`, async ({ page }) => {
    await page.goto(route);

    await expect(page.locator("footer")).toHaveCount(0);
    await expect(page.locator("header").getByRole("button", { name: /log in/i })).toHaveCount(0);
  });
}

test("mobile public routes do not overflow horizontally", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of publicRoutes) {
    await page.goto(route);
    await expectNoHorizontalOverflow(page);
  }
});

test("all mobile public and overlay targets provide at least 44px touch targets", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of publicRoutes) {
    await page.goto(route);
    await expectMinimumTouchTargets(page, route);
  }

  await page.goto("/en");
  await page.getByRole("button", { name: "Open menu" }).click();
  await expectMinimumTouchTargets(page, "open Sidebar");

  await page.goto("/en/portfolio");
  await page.getByRole("button", { name: /^View / }).first().click();
  await expectMinimumTouchTargets(page, "open Portfolio lightbox");

  await page.goto("/en/commission/illustration");
  await page.getByRole("button", { name: /View details for Illustration Half Body/ }).click();
  await expectMinimumTouchTargets(page, "open service dialog");

  await page.goto("/en/documents");
  await page.getByRole("button", { name: "Read document" }).first().click();
  await expectMinimumTouchTargets(page, "open document dialog");
});

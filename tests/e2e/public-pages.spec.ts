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
      const ariaLabel = element.getAttribute("aria-label");
      if (
        element.closest("nextjs-portal") ||
        ariaLabel === "Open Next.js Dev Tools" ||
        ariaLabel === "Open issues overlay" ||
        ariaLabel === "Collapse issues badge"
      ) return [];
      const box = (element instanceof HTMLInputElement && element.closest("label") ? element.closest("label")! : element).getBoundingClientRect();
      return box.width < 44 || box.height < 44
        ? [`${element.tagName.toLowerCase()}[${element.getAttribute("aria-label") ?? element.textContent?.trim() ?? ""}] ${Math.round(box.width)}x${Math.round(box.height)}`]
        : [];
    }),
  );
  expect(undersized, `undersized targets in ${state}`).toEqual([]);
}

test("visitor can browse the public commission journey", async ({ page }) => {
  await page.goto("/th/commission/illustration");
  await page.getByRole("button", { name: "ดูรายละเอียดและเรทราคา" }).first().click();
  await expect(page.getByRole("dialog", { name: /Half Body/ })).toBeVisible();
});

test("public queue exposes useful public progress without private fields", async ({ page }) => {
  await page.goto("/en/queue");

  await expect(page.getByRole("heading", { name: "Queue" })).toBeVisible();
  const rows = page.locator("tbody tr");
  if (!(await rows.count())) await expect(page.getByText(/no public queue|ยังไม่มีคิว/i)).toBeVisible();
  await expect(page.getByText(/quote-mali|payment-mali|mali@example\.test/)).toHaveCount(0);
});

test("Queue and Documents responses contain meaningful static HTML before hydration", async ({ request }) => {
  const queueHtml = await (await request.get("/en/queue")).text();
  expect(queueHtml).toContain(">Queue<");
  expect(queueHtml).not.toMatch(/quote-mali|payment-mali|mali@example\.test/);

  const documentsHtml = await (await request.get("/en/documents")).text();
  expect(documentsHtml).toContain("Document center");
  expect(documentsHtml).toMatch(/No documents|ยังไม่มีเอกสาร|Read document/);
});

test("public metadata exposes the Nasora SVG icon without a missing favicon request", async ({ page, request }) => {
  await page.goto("/en");
  const iconHref = await page.locator("link[rel~='icon']").first().getAttribute("href");
  expect(iconHref).toContain("/icon.svg");
  const iconResponse = await request.get(iconHref!);
  expect(iconResponse.ok()).toBe(true);
  expect(iconResponse.headers()["content-type"]).toContain("image/svg+xml");
});

test("commission contextual search finds categories and subtypes from both commission route shapes", async ({ page }) => {
  await page.goto("/en/commission");
  await page.getByRole("searchbox", { name: "Search commissions" }).fill("VTuber");
  await page.getByRole("searchbox", { name: "Search commissions" }).press("Enter");
  await expect(page).toHaveURL(/\/en\/commission\?q=VTuber$/);
  await expect(page.getByRole("heading", { name: "Commission search results" })).toBeVisible();
  await expect(page.getByRole("link", { name: /VTuber Reference/ })).toBeVisible();

  await page.goto("/en/commission/illustration");
  await page.getByRole("searchbox", { name: "Search commissions" }).fill("Chibi Full Body");
  await page.getByRole("searchbox", { name: "Search commissions" }).press("Enter");
  await expect(page).toHaveURL(/\/en\/commission\?q=Chibi(?:\+|%20)Full(?:\+|%20)Body$/);
  await expect(page.getByRole("link", { name: /Chibi Full Body/ })).toBeVisible();
});

test("Home featured links open their locale-prefixed Portfolio work", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/th");
  const featured = page.locator("#featured-work a").first();
  test.skip(!(await featured.count()), "requires at least one featured Portfolio item");
  await featured.click();

  await expect(page).toHaveURL(/\/th\/portfolio\?work=/);
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("published Portfolio media has no broken video fixture", async ({ page }) => {
  const failedMedia: string[] = [];
  page.on("response", (response) => {
    if (/\.(?:mp4|webp)(?:\?|$)/.test(response.url()) && !response.ok()) failedMedia.push(response.url());
  });
  await page.goto("/en/portfolio");
  await expect(page.locator('video source[src*="fixture-reel.mp4"], video[src*="fixture-reel.mp4"]')).toHaveCount(0);
  expect(failedMedia).toEqual([]);
});

test("public client bundles contain no private queue fixture fields", async ({ page, request }) => {
  await page.goto("/en/queue");
  const scripts = await page.locator('script[src]').evaluateAll((elements) => elements.map((element) => (element as HTMLScriptElement).src));
  const bundleText = (await Promise.all(scripts.map(async (url) => (await request.get(url)).text()))).join("\n");

  expect(bundleText).not.toMatch(/quote-mali|payment-mali|mali@example\.test|private\.example\/delivery/);
});

test("Thai commission output contains no common mojibake or C1 controls", async ({ page }) => {
  for (const route of ["/th/commission", "/th/commission/illustration"]) {
    await page.goto(route);
    const content = await page.locator("main").innerText();
    expect(content).not.toMatch(/[\u0080-\u009f]|(?:Ã.|Â.|à[¸¹])|�/u);
  }
});

test("published document direct route renders route content", async ({ page }) => {
  const response = await page.goto("/en/documents/commission-terms");
  test.skip(response?.status() === 404, "requires the commission-terms document to be published");
  await expect(page.getByRole("heading", { name: "Commission Terms" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to documents" })).toBeVisible();
});

test("service album eagerly loads its above-fold LCP image", async ({ page }) => {
  await page.goto("/en/commission/illustration");
  await expect(page.getByRole("heading", { name: "Illustration", exact: true })).toBeVisible();
  const images = page.locator("main article img");
  test.skip(!(await images.count()), "requires at least one published service cover");
  await expect(images.first()).toHaveAttribute("loading", "eager");
});

test("commission album grid eagerly loads only its true LCP item", async ({ page }) => {
  await page.goto("/en/commission");
  const albumImages = page.locator("main section button img");

  const count = await albumImages.count();
  test.skip(!count, "requires at least one published album cover");
  await expect(albumImages.first()).toHaveAttribute("loading", "eager");
  for (let index = 1; index < count; index += 1) {
    await expect(albumImages.nth(index)).toHaveAttribute("loading", "lazy");
  }
});

test("mobile service dialog controls stay above floating shell controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/commission/illustration");
  await page.getByRole("button", { name: "View Details & Rates" }).first().click();

  const dialog = page.getByRole("dialog", { name: /Half Body/ });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close details" }).click({ trial: true });
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
  await page.getByRole("button", { name: "View Details & Rates" }).first().click();
  await expectMinimumTouchTargets(page, "open service dialog");
  await page.getByRole("dialog").getByRole("button", { name: "Request Estimate", exact: true }).click();
  await expectMinimumTouchTargets(page, "open nested request preview");

  await page.goto("/en/documents");
  const latestNotice = page.getByRole("button", { name: /View details/ });
  if (await latestNotice.count()) {
    await latestNotice.click();
    await expectMinimumTouchTargets(page, "open document dialog");
  }
});

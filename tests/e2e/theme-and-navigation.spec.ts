import { expect, test } from "@playwright/test";

test("static HTML emits the requested locale before hydration", async ({ request }) => {
  for (const locale of ["th", "en"] as const) {
    const response = await request.get(`/${locale}`);
    expect(response.ok()).toBe(true);
    const html = await response.text();
    expect(html).toMatch(new RegExp(`<html[^>]+lang=["']${locale}["']`, "i"));
  }
});

test("public responses include the Stage 1 security headers", async ({ request }) => {
  const response = await request.get("/en");
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});

test("sidebar traps focus, closes with Escape, and restores focus", async ({ page }) => {
  await page.goto("/en");
  const menuButton = page.getByRole("button", { name: "Open menu" });
  await menuButton.focus();
  await menuButton.click();

  const sidebar = page.getByRole("complementary", { name: "Site navigation" });
  await expect(sidebar).toBeVisible();
  await expect(page.getByRole("button", { name: "Close menu", exact: true })).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await expect(sidebar.getByRole("button", { name: "Log in" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Close menu", exact: true })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(sidebar).toBeHidden();
  await expect(menuButton).toBeFocused();
});

test("sidebar closes through its backdrop", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Close menu backdrop" }).click({ position: { x: 380, y: 400 } });
  await expect(page.getByRole("complementary", { name: "Site navigation" })).toBeHidden();
});

test("Sidebar marks nested Commission and document routes as the current page", async ({ page }) => {
  for (const [route, label] of [["/en/commission/illustration", "Commission"], ["/en/documents/commission-terms", "Documents"]] as const) {
    await page.goto(route);
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
  }
});

test("Sidebar authentication preview receives focus, closes with Escape, and restores its initiating control", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("button", { name: "Open menu" }).click();
  const login = page.getByRole("button", { name: "Log in" });
  await login.click();

  await expect(page.getByRole("button", { name: "Close authentication preview" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Authentication preview" })).toHaveCount(0);
  await expect(login).toBeFocused();
});

test("floating Navbar keeps the same dimensions after scroll", async ({ page }) => {
  await page.goto("/en");
  const navbar = page.getByRole("banner");
  const before = await navbar.boundingBox();

  await page.evaluate(() => window.scrollTo(0, 320));
  const after = await navbar.boundingBox();

  expect(after?.width).toBe(before?.width);
  expect(after?.height).toBe(before?.height);
  await expect(navbar).not.toHaveAttribute("data-compact");
});

test("locale switch opens the alternate localized home", async ({ page }) => {
  await page.goto("/th");
  await page.getByRole("link", { name: "EN" }).click();

  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
});

test("manual theme choice persists after reload", async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.localStorage.getItem("nasora-theme")) {
      window.localStorage.setItem("nasora-theme", "night");
    }
  });
  await page.goto("/en");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
  await page.getByRole("button", { name: "Change theme: night" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "autumn");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "autumn");
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("nasora-theme"))).toBe("autumn");
});

test("public navigation hydrates without React warnings", async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && (
      message.text().includes("hydrated but some attributes")
      || message.text().includes("Encountered a script tag while rendering React component")
    )) {
      hydrationErrors.push(message.text());
    }
  });

  await page.goto("/th");
  await page.getByRole("link", { name: "EN" }).click();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  expect(hydrationErrors).toEqual([]);
});

test("keyboard focus has a visible focus indicator", async ({ page }) => {
  await page.goto("/en");
  await page.keyboard.press("Tab");

  const focusedOutline = await page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return null;
    const style = getComputedStyle(active);
    return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) };
  });
  expect(focusedOutline?.style).not.toBe("none");
  expect(focusedOutline?.width).toBeGreaterThanOrEqual(2);
});

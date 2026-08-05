import { expect, test } from "@playwright/test";

test("Home follows the approved 1920 desktop composition", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.addInitScript(() => window.localStorage.setItem("nasora-theme", "night"));
  await page.goto("/th");

  const shell = page.locator('[data-home-shell="true"]');
  const hero = page.locator('[data-home-hero="true"]');
  const lower = page.locator('[data-home-lower-grid="true"]');
  const shellBox = await shell.boundingBox();
  const heroBox = await hero.boundingBox();
  const lowerBox = await lower.boundingBox();

  expect(shellBox?.width).toBeGreaterThanOrEqual(1640);
  expect(shellBox?.width).toBeLessThanOrEqual(1690);
  expect(heroBox?.height).toBeLessThan(560);
  expect(lowerBox?.y).toBeLessThan(760);
  await expect(page.getByTestId("featured-loop-viewport")).toHaveAttribute("data-visible-count", "4");
  await expect(page.getByRole("tablist", { name: "ข้อมูลฉบับย่อ" })).toBeInViewport();
});

test("Home loop pauses from its visible control", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/th");

  const track = page.getByTestId("featured-loop-track");
  await page.getByRole("button", { name: "หยุดผลงานเด่น" }).click();
  await expect(track).toHaveAttribute("data-paused", "true");
  await page.getByRole("button", { name: "เล่นผลงานเด่น" }).click();
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect(track).toHaveAttribute("data-paused", "false");
});

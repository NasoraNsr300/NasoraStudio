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

  expect(shellBox?.width).toBeGreaterThanOrEqual(1400);
  expect(shellBox?.width).toBeLessThanOrEqual(1440);
  expect(heroBox?.height).toBeLessThan(560);
  expect(lowerBox?.y).toBeLessThan(760);
  const featuredViewport = page.getByTestId("featured-loop-viewport");
  if (await featuredViewport.count()) {
    await expect(featuredViewport).toHaveAttribute("data-visible-count", "4");
  } else {
    await expect(page.locator("#featured-work")).toContainText("ยังไม่มีผลงานแนะนำ");
  }
  await expect(page.getByRole("tablist", { name: "ข้อมูลฉบับย่อ" })).toBeInViewport();
});

test("Home featured work has no pause control and loops when populated", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/th");

  const track = page.getByTestId("featured-loop-track");
  await expect(page.getByRole("button", { name: "หยุดผลงานเด่น" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "เล่นผลงานเด่น" })).toHaveCount(0);
  if (!(await track.count())) {
    await expect(page.locator("#featured-work")).toContainText("ยังไม่มีผลงานแนะนำ");
    return;
  }
  await expect(track).toBeVisible();
  const animation = await track.evaluate((element) => {
    const styles = getComputedStyle(element);
    return { duration: styles.animationDuration, name: styles.animationName };
  });
  expect(animation.name).not.toBe("none");
  expect(animation.duration).not.toBe("0s");
});

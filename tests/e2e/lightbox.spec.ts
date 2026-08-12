import { expect, test } from "@playwright/test";

async function openFirstArtwork(page: import("@playwright/test").Page) {
  await page.goto("/en/portfolio");
  const opener = page.getByRole("button", { name: /^View / }).first();
  test.skip(!(await opener.count()), "requires at least one published Portfolio item");
  await opener.click();
  return opener;
}

test("portfolio opens one-image lightbox without gallery navigation", async ({ page }) => {
  await openFirstArtwork(page);
  const dialog = page.getByRole("dialog");

  await expect(dialog).toBeVisible();
  await expect(dialog.locator("img, video")).toHaveCount(1);
  await expect(dialog.getByRole("button", { name: /previous|next/i })).toHaveCount(0);
});

test("portfolio lightbox closes with its close control and restores focus", async ({ page }) => {
  const opener = await openFirstArtwork(page);
  await page.getByRole("button", { name: "Close artwork" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("portfolio lightbox closes with Escape", async ({ page }) => {
  const opener = await openFirstArtwork(page);
  await page.keyboard.press("Escape");

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("portfolio lightbox closes through its backdrop", async ({ page }) => {
  const opener = await openFirstArtwork(page);
  await page.getByRole("dialog").click({ position: { x: 2, y: 2 } });

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
});

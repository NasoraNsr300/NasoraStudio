import { expect, test } from "@playwright/test";

test("commission overview uses the English album display title in Thai", async ({ page }) => {
  await page.goto("/th/commission");

  const heading = page.getByRole("heading", { level: 1, name: "COMMISSION" });
  await expect(heading).toBeVisible();
  expect(await heading.evaluate((element) => getComputedStyle(element).fontFamily)).toContain("Georgia");
});

test("visitor browses an album and details without leaving Commission", async ({ page }) => {
  await page.goto("/th/commission");
  const commissionUrl = page.url();

  await page.getByRole("button", { name: /ดูอัลบั้ม Chibi/ }).click();
  await expect(page).toHaveURL(commissionUrl);

  const details = page.getByRole("button", { name: "ดูรายละเอียดและเรทราคา" }).first();
  await details.click();
  await expect(page.getByRole("dialog", { name: /Chibi/ })).toBeVisible();

  await page.getByRole("button", { name: "ปิดรายละเอียด" }).click();
  await expect(details).toBeFocused();
  await page.getByRole("button", { name: "กลับไปดูทุกอัลบั้ม" }).click();

  await expect(page).toHaveURL(commissionUrl);
  await expect(page.getByRole("button", { name: /ดูอัลบั้ม Chibi/ })).toBeVisible();
});

test("closed services keep details available while estimate is disabled", async ({ page }) => {
  await page.goto("/en/commission");
  await page.getByRole("button", { name: /View Minecraft 3D Model album/ }).click();

  await expect(page.getByRole("button", { name: "Request Estimate" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "View Details & Rates" })).toBeEnabled();
});

test("estimate opens without leaving service details behind", async ({ page }) => {
  await page.goto("/en/commission");
  await page.getByRole("button", { name: /View Chibi album/ }).click();
  await page.getByRole("button", { name: "Request Estimate" }).first().click();

  await expect(page.getByRole("dialog", { name: "Request an estimate" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);

  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Thai usage choices stay on one line in the estimate form", async ({ page }) => {
  await page.goto("/th/commission");
  await page.getByRole("button", { name: /Chibi/ }).first().click();
  await page.getByRole("button", { name: "ประเมินราคา" }).first().click();

  const commercialChoice = page
    .getByRole("radio", { name: "Commercial (เชิงพาณิชย์)" })
    .locator("..");

  await expect(commercialChoice).toHaveCSS("font-size", "12px");
  await expect(commercialChoice).toHaveCSS("white-space", "nowrap");
});

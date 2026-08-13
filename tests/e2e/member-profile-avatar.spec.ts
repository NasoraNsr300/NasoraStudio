import { expect, test } from "@playwright/test";

import { getTestCustomerCredentials } from "./fixtures/test-customer";

const credentials = getTestCustomerCredentials();
const firstAvatar = "E:/NasoraStudio/Img/615926480_1367631994643508_5264380239726292867_n.jpg";
const replacementAvatar = "E:/NasoraStudio/Img/625005632_18074429252106775_2813983176336144396_n.jpg";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/en?auth=1");
  await page.getByLabel("Email").fill(credentials!.email);
  await page.getByRole("textbox", { name: "Password" }).fill(credentials!.password);
  await page.getByRole("button", { exact: true, name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/auth=1/);
}

async function uploadAvatar(page: import("@playwright/test").Page, path: string) {
  await page.getByLabel("Choose profile image").setInputFiles(path);
  await expect(page.getByRole("img", { name: "Profile image preview" })).toBeVisible();
  const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/member/profile/avatar") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Upload profile image" }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const payload = await response.json() as { avatarMediaId: string; avatarUrl: string };
  await expect(page.getByText("Profile image updated", { exact: true })).toBeVisible();
  return payload;
}

test.describe("member profile avatar lifecycle", () => {
  test.skip(!credentials, "Set RUN_TEST_CUSTOMER_E2E=1 after resetting the local test customer.");

  test("normalizes, stores, synchronizes, reloads, replaces, and protects a private avatar", async ({ browser, page }) => {
    await signIn(page);
    await page.goto("/en/member/profile");
    await expect(page.getByLabel("Preferred language")).toHaveValue("th");

    const first = await uploadAvatar(page, firstAvatar);
    await expect(page.getByRole("img", { name: "Nasora Test Customer" })).toHaveCount(2);

    await page.getByRole("button", { name: "Account" }).click();
    await expect(page.getByRole("region", { name: "Account menu" }).getByRole("img", { name: "Nasora Test Customer" })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.reload();
    await expect(page.getByRole("img", { name: "Nasora Test Customer" })).toHaveCount(2);
    await expect(page.getByRole("img", { name: "Nasora Test Customer" }).first()).toHaveAttribute("src", first.avatarUrl);

    const anonymous = await browser.newContext();
    const anonymousResponse = await anonymous.request.get(first.avatarUrl);
    expect(anonymousResponse.status()).toBe(404);
    await anonymous.close();

    const replacement = await uploadAvatar(page, replacementAvatar);
    expect(replacement.avatarMediaId).not.toBe(first.avatarMediaId);
    await expect(page.getByRole("img", { name: "Nasora Test Customer" }).first()).toHaveAttribute("src", replacement.avatarUrl);
    await page.reload();
    await expect(page.getByRole("img", { name: "Nasora Test Customer" }).first()).toHaveAttribute("src", replacement.avatarUrl);
  });
});

import { expect, test } from "@playwright/test";

import { getTestCustomerCredentials } from "./fixtures/test-customer";

const credentials = getTestCustomerCredentials();

async function signIn(page: import("@playwright/test").Page, locale: "en" | "th" = "en") {
  await page.goto(`/${locale}?auth=1`);
  await page.getByLabel(locale === "th" ? "อีเมล" : "Email").fill(credentials!.email);
  await page.getByRole("textbox", { name: locale === "th" ? "รหัสผ่าน" : "Password" }).fill(credentials!.password);
  await page.getByRole("button", { exact: true, name: locale === "th" ? "เข้าสู่ระบบ" : "Sign in" }).click();
  await expect(page).not.toHaveURL(/auth=1/);
}

test.describe("ordinary customer security boundary", () => {
  test.skip(!credentials, "Set RUN_TEST_CUSTOMER_E2E=1 after resetting the local test customer.");

  test("signs in as a member and cannot enter Admin", async ({ page }) => {
    await signIn(page, "th");

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/th\?auth=1/);
    await expect(page.getByText("NASORA ADMIN")).toHaveCount(0);
  });

  test("submits and cancels a real member estimate request", async ({ page }) => {
    await signIn(page);
    await page.goto("/en/commission");
    test.skip(await page.getByText("CLOSED", { exact: true }).isVisible(), "Commissions are intentionally closed by the Admin setting.");
    await page.getByRole("button", { name: /View Chibi album/ }).click();
    const requestButton = page.getByRole("button", { name: "Request Estimate" }).first();
    test.skip(await requestButton.isDisabled(), "Commissions are currently closed by the Admin setting.");
    await requestButton.click();

    await page.getByRole("combobox", { name: /Estimated budget/ }).selectOption("open");
    const deadline = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    await page.getByLabel("Preferred deadline", { exact: true }).fill(deadline);
    await page.getByLabel("Character / project description").fill("Automated customer lifecycle check. Safe to cancel.");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Review and submit" }).click();
    await expect(page.getByRole("status")).toContainText("REQ-");

    await page.goto("/en/member/requests");
    const requestRow = page.getByText("Automated customer lifecycle check. Safe to cancel.");
    await expect(requestRow).toHaveCount(0);
    const cancelButton = page.getByRole("button", { name: "Cancel request" }).first();
    page.once("dialog", (dialog) => dialog.accept());
    await cancelButton.click();
    await expect(cancelButton).toBeHidden();
    await expect(page.getByText("Cancelled").first()).toBeVisible();
  });
});

import { expect, test } from "@playwright/test";

import { getTestCustomerCredentials } from "./fixtures/test-customer";

const credentials = getTestCustomerCredentials();

test.describe("ordinary customer security boundary", () => {
  test.skip(!credentials, "Set RUN_TEST_CUSTOMER_E2E=1 after resetting the local test customer.");

  test("signs in as a member and cannot enter Admin", async ({ page }) => {
    await page.goto("/th?auth=1");
    await page.getByLabel("อีเมล").fill(credentials!.email);
    await page.getByLabel("รหัสผ่าน").fill(credentials!.password);
    await page.getByRole("button", { exact: true, name: "เข้าสู่ระบบ" }).click();

    await expect(page).not.toHaveURL(/auth=1/);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/th\?auth=1/);
    await expect(page.getByText("NASORA ADMIN")).toHaveCount(0);
  });
});

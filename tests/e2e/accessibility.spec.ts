import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const representativeRoutes = [
  "/en",
  "/th/portfolio",
  "/en/commission",
  "/th/queue",
  "/en/documents",
] as const;

for (const route of representativeRoutes) {
  test(`${route} has no critical or serious automated accessibility violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
    expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
  });
}

test("representative dialogs have no critical or serious automated accessibility violations", async ({ page }) => {
  await page.goto("/en/commission/illustration");
  await page.getByRole("button", { name: /View details for Illustration Half Body/ }).click();
  const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
  const blocking = results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
  expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
});

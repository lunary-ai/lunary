import { test } from "@playwright/test";

test("logout and back in login", async ({ page }) => {
  await page.goto("/");

  await page.waitForLoadState("networkidle");

  await page.getByTestId("account-sidebar-item").click();
  await page.getByTestId("logout-button").click();

  await page.waitForURL("**/login*");

  await page.getByPlaceholder("Your email").click();
  await page.getByPlaceholder("Your email").fill("test@lunary.ai");

  await page.getByPlaceholder("Your password").click();
  await page.getByPlaceholder("Your password").fill("testtest");

  await page.getByRole("button", { name: "Login" }).click();

  await page.waitForURL("**/dashboards*");
});

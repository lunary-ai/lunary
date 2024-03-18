import { test, expect } from "@playwright/test"

test("logout and login flow", async ({ page }) => {
  await page.goto("/")

  // logout
  await page.getByTestId("account-sidebar-item").click()
  await page.getByTestId("logout-button").click()

  await page.waitForURL("**/login")

  // log back in
  await page.getByPlaceholder("Your email").click()
  await page.getByPlaceholder("Your email").fill("test@lunary.ai")

  await page.getByTestId("continue-button").click()

  await page.getByPlaceholder("Your password").click()
  await page.getByPlaceholder("Your password").fill("testtest")

  await page.getByRole("button", { name: "Login" }).click()

  await page.waitForURL("**/analytics")
})

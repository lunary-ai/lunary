import { test } from "@playwright/test"

test("logout and back in login", async ({ page }) => {
  await page.goto("/")

  await page.waitForLoadState("networkidle")

  // logout
  await page.getByTestId("account-sidebar-item").click()
  await page.getByTestId("logout-button").click()

  await page.waitForURL("**/login")

  // log back in
  await page.getByPlaceholder("Your email").click()
  await page.getByPlaceholder("Your email").fill("test@lunary.ai")

  await page.getByTestId("continue-button").click()

  await page.waitForResponse((resp) => resp.url().includes("/method"))

  await page.getByPlaceholder("Your password").click()
  await page.getByPlaceholder("Your password").fill("testtest")

  await page.getByRole("button", { name: "Login" }).click()

  await page.waitForURL("**/analytics")
})

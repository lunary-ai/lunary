import { expect, test } from "@playwright/test"

test.describe.configure({ mode: "serial" })

test("create new project, rename it and delete it", async ({ page }) => {
  await page.goto("/")

  await page.waitForLoadState("networkidle")

  await page.getByRole("button", { name: "TESTPROJECT" }).click()

  await page.getByTestId("new-project").click()

  await page.getByRole("heading", { name: "Project #" }).click()
  await page.getByTestId("rename-input").fill("TESTPROJECT2")
  await page.getByTestId("rename-input").press("Enter")

  await expect(
    page.getByRole("heading", { name: "TESTPROJECT2" }),
  ).toBeVisible()

  await page.getByRole("button", { name: "TESTPROJECT2" }).click()
  await page.goto("/settings")

  await page.getByTestId("delete-project-button").click()
  await page.getByTestId("delete-project-popover-button").click()

  // If the project was deleted successfully, it redirects to the analytics page
  await page.waitForURL("**/analytics")
})

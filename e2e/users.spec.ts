import test, { expect } from "@playwright/test"

test("view external users list", async ({ page }) => {
  await page.goto("/users")

  const table = page.locator("table")
  await expect(table.getByText("Salut-123")).toBeVisible()
})

import { test, expect } from "@playwright/test"
import { setOrgFree, setOrgPro } from "./db-utils"

test.beforeAll(async () => {
  // need to be pro for multiple projects
  await setOrgPro()
})

test.afterAll(async () => {
  await setOrgFree()
})

test("create new project and rename it", async ({ page }) => {
  await page.goto("/")

  //wait for requests to finish
  await page.waitForLoadState("networkidle")

  await page.getByRole("button", { name: "TESTPROJECT" }).click()

  await page.getByTestId("new-project").click()

  await page.getByRole("heading", { name: "Project #" }).click()
  await page.getByTestId("rename-input").fill("TESTPROJECT2")
  await page.getByTestId("rename-input").press("Enter")

  await expect(
    page.getByRole("heading", { name: "TESTPROJECT2" }),
  ).toBeVisible()
})

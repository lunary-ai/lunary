import { expect, test } from "@playwright/test"

test.describe.configure({ mode: "serial" })

let publicLogUrl: string

test("make a log public", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"])

  await page.goto("/logs")

  await page.waitForLoadState("networkidle")

  await page.getByText("xyzTESTxyz").click()

  await page.getByTestId("make-log-public-switch").click()

  publicLogUrl = await page.evaluate(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const selected = urlParams.get("selected")
    return `${window.location.origin}/logs/${selected}`
  })
})

test("unauthenticated user can access public log URL", async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(publicLogUrl)
  await page.waitForLoadState("networkidle")

  await expect(page.getByText("xyzTESTxyz")).toBeVisible()

  await context.close()
})

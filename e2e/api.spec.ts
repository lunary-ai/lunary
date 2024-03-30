import { test, expect } from "@playwright/test"

let privateKey = null
let publicKey = null

// run tests one after another
test.describe.configure({ mode: "serial" })

test("regenerate api keys", async ({ page }) => {
  await page.goto("/settings")

  await page.waitForLoadState("networkidle")

  publicKey = await page.getByTestId("private-key").textContent()

  const firstPrivateKey = await page.getByTestId("private-key").textContent()

  expect(publicKey).toHaveLength(36) // uuid length
  expect(firstPrivateKey).toHaveLength(36) // uuid length

  await page.waitForTimeout(300) // helps with flakiness in local

  await page.getByTestId("regenerate-private-key-button").click()

  const promise = page.waitForResponse((resp) =>
    resp.url().includes("/regenerate-key"),
  )
  await page.getByTestId("confirm-button").click()
  // wait until button re-contain "Regenerate"
  await promise

  const secondPrivateKey = await page.getByTestId("private-key").textContent()

  console.log({ firstPrivateKey, secondPrivateKey })

  expect(firstPrivateKey).not.toEqual(secondPrivateKey)

  privateKey = secondPrivateKey
})

test("private api /logs", async ({ page }) => {
  // Test API query

  const res = await fetch(process.env.API_URL + "/v1/runs", {
    method: "GET",
    headers: {
      "X-API-Key": privateKey!,
    },
  })

  const json = await res.json()

  // expect to be an array
  expect(json).toBeInstanceOf(Array)
})

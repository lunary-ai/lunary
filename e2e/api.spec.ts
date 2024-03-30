import { test, expect } from "@playwright/test"

let privateKey = null
let publicKey = null

// run tests one after another
test.describe.configure({ mode: "serial" })

test("regenerate api keys", async ({ page }) => {
  await page.goto("/settings")

  publicKey = await page.getByTestId("private-key").textContent()

  const firstPrivateKey = await page.getByTestId("private-key").textContent()

  // expect to not be empty string
  expect(firstPrivateKey).not.toEqual("")

  await page.getByTestId("regenerate-private-key-button").click()

  const secondPrivateKey = await page.getByTestId("private-key").textContent()

  console.log({ firstPrivateKey, secondPrivateKey })

  expect(firstPrivateKey).not.toEqual(secondPrivateKey)

  privateKey = secondPrivateKey
})

test("private api /logs", async ({ page }) => {
  // Test API query

  const res = await fetch(process.env.API_URL + "/api/v1/runs", {
    method: "POST",
    headers: {
      "X-API-Key": privateKey!,
    },
  })

  const json = await res.json()

  expect(json).toEqual([])
})

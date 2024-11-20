import { test, expect } from "@playwright/test";

let privateKey: string | null;
let publicKey: string | null = null;

const apiUrl = process.env.API_URL || "http://localhost:3333";

test("regenerate api keys", async ({ page }) => {
  await page.goto("/settings");

  await page.waitForLoadState("networkidle");

  publicKey = await page.getByTestId("public-key").textContent();

  const firstPrivateKey = await page.getByTestId("private-key").textContent();

  expect(publicKey).toHaveLength(36); // uuid length
  expect(firstPrivateKey).toHaveLength(36); // uuid length

  await page.waitForTimeout(300); // helps with flakiness in local

  await page.getByTestId("regenerate-private-key-button").click();

  await page.getByTestId("confirm-button").click();

  await page.waitForResponse((resp) => resp.url().includes("/regenerate-key"));

  await page.waitForTimeout(1500);

  const secondPrivateKey = await page.getByTestId("private-key").textContent();

  expect(firstPrivateKey).not.toEqual(secondPrivateKey);

  console.log(publicKey, await page.getByTestId("public-key").textContent());

  privateKey = secondPrivateKey;
});

test("private api /logs", async ({ page }) => {
  // Test API query

  if (!privateKey) return;

  const res = await fetch(apiUrl + "/v1/runs", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": privateKey,
    },
  });

  const json = await res.json();
  console.log(json);
  expect(json.data).toBeInstanceOf(Array);
});

test("create dataset", async ({ page }) => {
  // Test API query

  if (!privateKey) return;

  const res = await fetch(apiUrl + "/v1/datasets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": privateKey,
    },
    body: JSON.stringify({
      slug: "test-dataset",
      type: "chat",
    }),
  });

  const json = await res.json();
  console.log(json);
  expect(json.slug).toEqual("test-dataset");
});

test("get dataset publicly via slug", async ({ page }) => {
  // Test API query

  const res = await fetch(apiUrl + "/v1/datasets/test-dataset", {
    method: "GET",
    headers: {
      // Use the legacy way to pass the API key (used in old SDKs)
      "Content-Type": "application/json",
      Authorization: `Bearer ${publicKey}`,
    },
  });

  const json = await res.json();
  console.log(json);
  expect(json.items).toBeInstanceOf(Array);
});

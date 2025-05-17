import { expect, test } from "@playwright/test";

let privateKey = null;
let publicKey = null;

// run tests one after another
test.describe.configure({ mode: "serial" });

const apiUrl = process.env.API_URL || "http://localhost:3333";
test.use({ storageState: ".auth/user.json" });

test("regenerate api keys", async ({ page }) => {
  await page.goto("/settings");

  await page.waitForLoadState("networkidle");

  publicKey = await page.getByTestId("public-key").textContent();

  const firstPrivateKey = await page.getByTestId("private-key").textContent();
  if (typeof firstPrivateKey !== "string") {
    throw new Error("Private key is not a string");
  }

  expect(publicKey).toHaveLength(36);
  expect(firstPrivateKey).toHaveLength(36);

  const responsePromise = page.waitForResponse((response) =>
    response.url().includes("regenerate-key"),
  );
  await page.getByTestId("regenerate-private-key-button").click();

  await page.getByTestId("confirm-button").click();
  await responsePromise;

  await expect(page.getByTestId("private-key")).not.toHaveText(firstPrivateKey);
  const secondPrivateKey = await page.getByTestId("private-key").textContent();

  expect(firstPrivateKey).not.toEqual(secondPrivateKey);

  privateKey = secondPrivateKey;
});

test("private api /logs", async ({ page }) => {
  // Test API query

  const res = await fetch(apiUrl + "/v1/runs", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": privateKey!,
    },
  });

  const json = await res.json() as { data: unknown[] };
  expect(json.data).toBeInstanceOf(Array);
});

test("create dataset", async ({ page }) => {
  // Test API query

  const res = await fetch(apiUrl + "/v1/datasets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": privateKey!,
    },
    body: JSON.stringify({
      slug: "test-dataset",
      type: "chat",
    }),
  });

  const json = await res.json() as { slug: string };
  expect(json.slug).toEqual("test-dataset");
});

test("get dataset publicly via slug", async ({ page }) => {
  // Test API query

  const res = await fetch(apiUrl + "/v1/datasets/test-dataset", {
    method: "GET",
    headers: {
      // Use the legacy way to pass the API key (used in old SDKs)
      "Content-Type": "application/json",
      Authorization: `Bearer ${publicKey!}`,
    },
  });

  const json = await res.json() as {  items: unknown[] };
  expect(json.items).toBeInstanceOf(Array);
});

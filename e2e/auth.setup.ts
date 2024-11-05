import { test, expect } from "@playwright/test";

import { deleteOrg, populateLogs } from "./utils/db";

const authFile = "e2e/.auth/user.json";

test.beforeAll(async () => {
  // Sometimes the teardown isn't called, so we need to clean up the database before running the tests
  await deleteOrg();
});

test("signup flow", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Sign Up" }).click();

  await page.waitForURL("**/signup");

  await page.getByPlaceholder("Your email").click();
  await page.getByPlaceholder("Your email").fill("test@lunary.ai");

  await page.getByPlaceholder("Your full name").click();
  await page.getByPlaceholder("Your full name").fill("test test");

  await page.getByPlaceholder("Pick a  password").click();
  await page.getByPlaceholder("Pick a  password").fill("testtest");

  await page.getByTestId("continue-button").click();

  await page.waitForURL("**/analytics");

  await expect(
    page.getByRole("heading", { name: "Waiting for data..." }),
  ).toBeVisible();

  await page.context().storageState({ path: authFile });

  await populateLogs();
});

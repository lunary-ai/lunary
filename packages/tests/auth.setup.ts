import { test } from "@playwright/test";

import { deleteOrg, populateLogs } from "./utils/db";

const authFile = ".auth/user.json";

test.beforeAll(async () => {
  // ensure the database is clean before we run the tests
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

  await page.waitForURL("**/dashboards*");

  await page.context().storageState({ path: authFile });

  await populateLogs();
});

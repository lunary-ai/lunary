import { expect, test } from "@playwright/test";

test("create new project, rename it and delete it", async ({ page }) => {
  await page.goto("/");

  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Project #1" }).click();

  await page.getByTestId("new-project").click();

  await page.getByTestId("project-name-input").fill("Project #12");
  await page.getByTestId("project-name-input").press("Enter");
  // TODO: check project renamed

  await page.goto("/settings");

  await page.getByTestId("delete-project-button").click();
  await page.getByTestId("delete-project-popover-button").click();

  await page.waitForURL("**/dashboards/**");
});

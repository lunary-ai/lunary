// import { expect, test } from "@playwright/test";

// test("create new project, rename it and delete it", async ({ page }) => {
//   await page.goto("/");

//   await page.waitForLoadState("networkidle");

//   await page.getByRole("button", { name: "Project #1" }).click();

//   await page.getByTestId("new-project").click();

//   await page.getByRole("heading", { name: "Project #" }).click();
//   await page.getByTestId("rename-input").fill("Project #12");
//   await page.getByTestId("rename-input").press("Enter");

//   await expect(
//     page.getByRole("heading", { name: "Project #12" }),
//   ).toBeVisible();

//   await page.getByRole("button", { name: "Project #12" }).click();
//   await page.goto("/settings");

//   await page.getByTestId("delete-project-button").click();
//   await page.getByTestId("delete-project-popover-button").click();

//   await page.waitForURL("**/dashboards/**");
// });
